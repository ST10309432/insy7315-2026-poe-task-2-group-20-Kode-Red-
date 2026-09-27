

import { chargeCredit, refundCredit } from './creditService.js';


export class PaymentStrategy {
  // eslint-disable-next-line no-unused-vars
  async pay(context) {
    throw new Error('pay() not implemented');
  }
  // eslint-disable-next-line no-unused-vars
  async refund(context) {
    throw new Error('refund() not implemented');
  }
}

/** Throws if a guest tries to use a student-only payment method. */
function assertIsStudent(student, methodLabel) {
  if (!student) {
    throw new PaymentError(
      `${methodLabel} is only available to registered students, not guest customers.`,
    );
  }
}

export class WalletPayment extends PaymentStrategy {
  async pay({ studentId, amount, repos, dbClient }) {
    const student = await repos.studentRepository.getById(studentId);
    assertIsStudent(student, 'Wallet payment');

    const balance = await repos.walletRepository.getBalance(studentId);
    if (balance < amount) {
      throw new PaymentError(`Insufficient wallet balance (R${balance.toFixed(2)} available).`);
    }
    await repos.walletRepository.deduct(studentId, amount, dbClient);
    await repos.walletRepository.recordTransaction(
      { studentId, type: 'ORDER_PAYMENT', amount: -amount },
      dbClient,
    );
    return { method: 'WALLET', charged: amount };
  }

  async refund({ studentId, amount, repos, dbClient }) {
    await repos.walletRepository.topUp(studentId, amount, dbClient);
    await repos.walletRepository.recordTransaction(
      { studentId, type: 'ORDER_REFUND', amount },
      dbClient,
    );
    return { method: 'WALLET', refunded: amount };
  }
}


export class CreditPayment extends PaymentStrategy {
  async pay({ studentId, amount, repos, dbClient }) {
    const student = await repos.studentRepository.getById(studentId);
    assertIsStudent(student, 'Student Credit');
    return chargeCredit(repos.studentRepository, repos.creditRepository, studentId, amount, dbClient);
  }

  async refund({ studentId, amount, repos, dbClient }) {
    return refundCredit(repos.creditRepository, studentId, amount, dbClient);
  }
}


export class CardPayment extends PaymentStrategy {
  async pay({ amount, cardToken, repos }) {
    if (!repos.paymentGateway) {
      throw new PaymentError('Card payment gateway is not configured.');
    }
    const result = await repos.paymentGateway.charge({ amount, cardToken });
    if (!result || !result.success) {
      throw new PaymentError('Card payment was declined.');
    }
    return { method: 'CARD', charged: amount, gatewayReference: result.gatewayReference };
  }

  async refund({ amount, gatewayReference, repos }) {
    const result = await repos.paymentGateway.refund({ gatewayReference, amount });
    if (!result || !result.success) {
      throw new PaymentError('Card refund failed at the gateway.');
    }
    return { method: 'CARD', refunded: amount };
  }
}

const STRATEGIES = {
  WALLET: new WalletPayment(),
  CREDIT: new CreditPayment(),
  CARD: new CardPayment(),
};

/** Picks the right strategy object for a payment method string. */
export function getPaymentStrategy(method) {
  const strategy = STRATEGIES[method];
  if (!strategy) {
    throw new PaymentError(`Unknown payment method: ${method}`);
  }
  return strategy;
}

export class PaymentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = 402;
  }
}
