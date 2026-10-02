// Creates in-app notifications (FR-14 order notifications to students, FR-27 activity for Thabang).
// Uses the caller's DB transaction when one is passed, so a failed order never leaves a stray notification.
const notificationRepo = require('../repositories/notificationRepository');
const userRepo = require('../repositories/userRepository');

const orderLink = n => `/app/orders/${n}`;

const MESSAGES = {
  PLACED: n => ({ type: 'ORDER', title: `Order ${n} confirmed`, body: 'We\'ll let you know when it\'s ready.', link: orderLink(n) }),
  ACCEPTED: n => ({ type: 'ORDER', title: `Order ${n} accepted`, body: 'Thabang is preparing your food.', link: orderLink(n) }),
  PREPARING: n => ({ type: 'ORDER', title: `Order ${n} is being prepared`, body: '', link: orderLink(n) }),
  READY: n => ({ type: 'ORDER_READY', title: `Order ${n} is ready!`, body: 'Come to the truck and show your order number.', link: orderLink(n) }),
  COLLECTED: n => ({ type: 'ORDER', title: `Enjoy your meal`, body: `Tell us how order ${n} was.`, link: orderLink(n) }),
  CANCELLED: n => ({ type: 'ORDER', title: `Order ${n} cancelled`, body: 'Any wallet, credit or points used have been returned.', link: orderLink(n) }),
};

module.exports = {
  orderStatus: (userId, orderNumber, status, client) =>
    MESSAGES[status] ? notificationRepo.create(userId, MESSAGES[status](orderNumber), client) : null,

  newOrderForStaff: async (order, client) => {
    const staff = await userRepo.staffIds(client);
    if (!staff.length) return;
    await notificationRepo.createMany(staff, { type: 'NEW_ORDER', title: `New order ${order.orderNumber}`,
      body: `${order.customerName} · R${order.total.toFixed(2)} · ${order.paymentMethod}`, link: '/admin/orders' }, client);
  },

  freeMealEarned: (userId, client) =>
    notificationRepo.create(userId, { type: 'LOYALTY', title: 'You earned a free meal!',
      body: 'Use it at checkout on your next order.', link: '/app/account' }, client),

  studentVerified: userId =>
    notificationRepo.create(userId, { type: 'ACCOUNT', title: 'You\'re verified',
      body: 'Student Credit is now unlocked on your account.', link: '/app/wallet' }),

  send: (userId, n, client) => notificationRepo.create(userId, n, client),
};
