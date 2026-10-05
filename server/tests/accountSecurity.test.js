// Account security tests (Molemo): lockout, change password, sliding session.
// The user repository is mocked, so these run without a database.
process.env.NODE_ENV = 'test';
jest.mock('../src/repositories/userRepository');

const bcrypt = require('bcryptjs');
const request = require('supertest');
const userRepo = require('../src/repositories/userRepository');
const security = require('../src/services/securityService');
const authService = require('../src/services/authService');
const { signToken } = require('../src/middleware/auth');
const app = require('../src/app');
const { pool } = require('../src/config/db');

afterAll(() => pool.end());

const NOW = new Date('2026-10-05T10:00:00Z');
const minutes = n => new Date(NOW.getTime() + n * 60000);

describe('lockout rules', () => {
  test('a wrong password adds one to the count', () => {
    expect(security.nextFailure({ failed_logins: 2 }, NOW)).toEqual({ failedLogins: 3, lockedUntil: null });
  });
  test('the 5th wrong password locks the account for 15 minutes', () => {
    expect(security.nextFailure({ failed_logins: 4 }, NOW)).toEqual({ failedLogins: 5, lockedUntil: minutes(15) });
  });
  test('after a lock expires the count starts again', () => {
    expect(security.nextFailure({ failed_logins: 5, locked_until: minutes(-1) }, NOW).failedLogins).toBe(1);
  });
  test('isLocked is true only while the lock is in the future', () => {
    expect(security.isLocked({ locked_until: minutes(5) }, NOW)).toBe(true);
    expect(security.isLocked({ locked_until: minutes(-5) }, NOW)).toBe(false);
    expect(security.isLocked({ locked_until: null }, NOW)).toBe(false);
    expect(security.isLocked(undefined, NOW)).toBe(false);
  });
  test('the locked message says how long is left', () => {
    const err = security.lockedError(minutes(14.2), NOW);
    expect(err.status).toBe(423);
    expect(err.message).toMatch(/15 more minutes/);
  });
});

describe('login with lockout', () => {
  let user;
  beforeEach(async () => {
    jest.resetAllMocks();
    user = { user_id: 7, role: 'STUDENT', password_hash: await bcrypt.hash('Password123!', 4), failed_logins: 0, locked_until: null };
    userRepo.findByEmail.mockResolvedValue(user);
    userRepo.findById.mockResolvedValue({ id: 7, role: 'STUDENT', email: 'lerato@vcconnect.edu.za' });
  });

  test('a wrong password is recorded and returns 401', async () => {
    await expect(authService.login({ email: 'lerato@vcconnect.edu.za', password: 'wrong' })).rejects.toMatchObject({ status: 401 });
    expect(userRepo.recordFailedLogin).toHaveBeenCalledWith(7, 1, null);
  });

  test('the 5th wrong password locks the account (423)', async () => {
    user.failed_logins = 4;
    await expect(authService.login({ email: 'lerato@vcconnect.edu.za', password: 'wrong' })).rejects.toMatchObject({ status: 423 });
    expect(userRepo.recordFailedLogin).toHaveBeenCalledWith(7, 5, expect.any(Date));
  });

  test('a locked account is refused even with the right password', async () => {
    user.locked_until = new Date(Date.now() + 10 * 60000);
    await expect(authService.login({ email: 'lerato@vcconnect.edu.za', password: 'Password123!' })).rejects.toMatchObject({ status: 423 });
  });

  test('a successful login resets the failed count', async () => {
    user.failed_logins = 3;
    const result = await authService.login({ email: 'lerato@vcconnect.edu.za', password: 'Password123!' });
    expect(result.token).toBeTruthy();
    expect(userRepo.resetFailedLogins).toHaveBeenCalledWith(7);
  });

  test('an unknown email gives the same 401 and records nothing', async () => {
    userRepo.findByEmail.mockResolvedValue(undefined);
    await expect(authService.login({ email: 'nobody@x.com', password: 'wrong' })).rejects.toMatchObject({ status: 401 });
    expect(userRepo.recordFailedLogin).not.toHaveBeenCalled();
  });
});

describe('change password', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    userRepo.getPasswordHash.mockResolvedValue(await bcrypt.hash('Password123!', 4));
    userRepo.findById.mockResolvedValue({ id: 7, role: 'STUDENT' });
  });

  test('rejects a wrong current password', async () => {
    await expect(authService.changePassword(7, { currentPassword: 'nope', newPassword: 'NewPass456' }))
      .rejects.toMatchObject({ status: 400 });
    expect(userRepo.updatePassword).not.toHaveBeenCalled();
  });

  test('saves a new bcrypt hash and returns a new token', async () => {
    const result = await authService.changePassword(7, { currentPassword: 'Password123!', newPassword: 'NewPass456' });
    const [, savedHash] = userRepo.updatePassword.mock.calls[0];
    expect(await bcrypt.compare('NewPass456', savedHash)).toBe(true);
    expect(result.token).toBeTruthy();
  });
});

describe('security endpoints', () => {
  const token = signToken({ user_id: 7, role: 'STUDENT' });
  beforeEach(() => {
    jest.resetAllMocks();
    userRepo.findById.mockResolvedValue({ id: 7, role: 'STUDENT' });
  });

  test('change password needs a login', async () => {
    expect((await request(app).patch('/api/auth/me/password').send({})).status).toBe(401);
  });

  test('change password rejects a weak new password', async () => {
    const res = await request(app).patch('/api/auth/me/password').set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map(d => d.field)).toContain('newPassword');
  });

  test('change password rejects re-using the same password', async () => {
    const res = await request(app).patch('/api/auth/me/password').set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'Password123!' });
    expect(res.status).toBe(400);
  });

  test('refresh needs a login', async () => {
    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
  });

  test('refresh swaps a valid token for a new one', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  test('a student cannot reach admin endpoints (403)', async () => {
    expect((await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
});
