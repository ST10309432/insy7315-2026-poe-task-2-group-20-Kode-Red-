// Unit tests for creditService (Task 1 §6). Owner: Liyabona (business logic).
const { availableCredit, canBorrow, creditState } = require('../src/services/creditService');

const account = (over = {}) => ({ credit_limit: 200, outstanding_balance: 90, status: 'ACTIVE', ...over });

describe('availableCredit', () => {
  test('is the limit minus what is owed', () => {
    expect(availableCredit(account())).toBe(110);
  });
});

describe('canBorrow (outstanding + total <= limit)', () => {
  test('allows an order exactly at the limit', () => {
    expect(canBorrow(account(), 110)).toEqual({ ok: true, available: 110 });
  });
  test('blocks an order one cent over the limit', () => {
    const r = canBorrow(account(), 110.01);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('Only R110.00 credit available');
  });
  test.each(['OVERDUE', 'SUSPENDED'])('blocks %s accounts', status => {
    expect(canBorrow(account({ status }), 1).ok).toBe(false);
  });
  test('blocks students without a credit account', () => {
    expect(canBorrow(null, 1).ok).toBe(false);
  });
});

describe('creditState (Task 1 §6.2)', () => {
  test('ACTIVE while there is credit left', () => {
    expect(creditState(account())).toBe('ACTIVE');
  });
  test('AT_LIMIT when nothing is left to spend', () => {
    expect(creditState(account({ outstanding_balance: 200 }))).toBe('AT_LIMIT');
  });
  test('OVERDUE and SUSPENDED win over the balance', () => {
    expect(creditState(account({ status: 'OVERDUE' }))).toBe('OVERDUE');
    expect(creditState(account({ status: 'SUSPENDED', outstanding_balance: 0 }))).toBe('SUSPENDED');
  });
  test('null when there is no account', () => {
    expect(creditState(undefined)).toBeNull();
  });
});