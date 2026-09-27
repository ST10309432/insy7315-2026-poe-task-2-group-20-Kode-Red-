

export const BLOCKING_STATUSES = ['OVERDUE', 'SUSPENDED'];

export function canBorrow(student, creditAccount, amount) {
  if (!student) {
    return { allowed: false, reason: 'Student not found.' };
  }
  if (!student.verified) {
    return { allowed: false, reason: 'Only verified students may use Student Credit.' };
  }
  if (!creditAccount) {
    return { allowed: false, reason: 'No credit account on file for this student.' };
  }
  if (BLOCKING_STATUSES.includes(creditAccount.status)) {
    return {
      allowed: false,
      reason: `Student Credit is blocked while the account is ${creditAccount.status}.`,
    };
  }

  const projectedOutstanding = round2(creditAccount.outstandingBalance + amount);
  if (projectedOutstanding > creditAccount.creditLimit) {
    const available = round2(creditAccount.creditLimit - creditAccount.outstandingBalance);
    return {
      allowed: false,
      reason: `Order exceeds available credit (R${available.toFixed(2)} available).`,
    };
  }

  return { allowed: true, reason: null };
}


export async function chargeCredit(studentRepository, creditRepository, studentId, amount, dbClient) {
  const [student, creditAccount] = await Promise.all([
    studentRepository.getById(studentId),
    creditRepository.getAccount(studentId),
  ]);

  const decision = canBorrow(student, creditAccount, amount);
  if (!decision.allowed) {
    throw new CreditError(decision.reason);
  }

  await creditRepository.charge(studentId, amount, dbClient);
  return {
    method: 'CREDIT',
    charged: amount,
    newOutstanding: round2(creditAccount.outstandingBalance + amount),
  };
}

/** Reverses a credit charge - used on order cancellation  */
export async function refundCredit(creditRepository, studentId, amount, dbClient) {
  await creditRepository.repay(studentId, amount, dbClient);
  return { method: 'CREDIT', refunded: amount };
}


export async function repayCredit(creditRepository, studentId, amount, dbClient) {
  if (amount <= 0) {
    throw new CreditError('Repayment amount must be greater than zero.');
  }
  const creditAccount = await creditRepository.getAccount(studentId);
  if (!creditAccount) {
    throw new CreditError('No credit account on file for this student.');
  }
  const repayAmount = Math.min(amount, creditAccount.outstandingBalance);

  await creditRepository.repay(studentId, repayAmount, dbClient);
  await creditRepository.recordRepayment(
    { studentId, amount: repayAmount, paidAt: new Date() },
    dbClient,
  );

  return {
    repaid: repayAmount,
    newOutstanding: round2(creditAccount.outstandingBalance - repayAmount),
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class CreditError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CreditError';
    this.statusCode = 403;
  }
}
