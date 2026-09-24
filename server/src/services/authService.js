// Registration and login. Owner: Molemo (security).
const bcrypt = require('bcryptjs');
const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const userRepo = require('../repositories/userRepository');
const settingsRepo = require('../repositories/settingsRepository');
const { signToken } = require('../middleware/auth');

async function register({ fullName, email, password, studentNumber, campus, phone }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw AppError.conflict('An account with this email already exists', [{ field: 'email', message: 'Email already registered' }]);

  const passwordHash = await bcrypt.hash(password, 12);
  const role = studentNumber ? 'STUDENT' : 'GUEST';

  const created = await withTransaction(async client => {
    const user = await userRepo.create({ fullName, email, passwordHash, role, studentNumber, campus, phone }, client);
    if (role === 'STUDENT') {
      const settings = await settingsRepo.getSettings(client);
      await userRepo.createWallet(user.user_id, client);
      await userRepo.createCreditAccount(user.user_id, settings.defaultCreditLimit, client);
    }
    return user;
  });
  return { token: signToken(created), user: await userRepo.findById(created.user_id) };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  // Same message whether the email or password is wrong, so attackers can't discover accounts
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw AppError.unauthorized('Incorrect email or password');
  return { token: signToken(user), user: await userRepo.findById(user.user_id) };
}

module.exports = { register, login };
