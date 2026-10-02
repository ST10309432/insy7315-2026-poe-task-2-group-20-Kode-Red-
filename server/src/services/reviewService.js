// Reviews (FR-13): a student can rate each collected order once.
const AppError = require('../utils/AppError');
const orderRepo = require('../repositories/orderRepository');
const reviewRepo = require('../repositories/reviewRepository');
const reportRepo = require('../repositories/reportRepository');

async function reviewOrder(orderNumber, userId, { rating, comment }) {
  const order = await orderRepo.findByNumber(orderNumber);
  if (!order || order.userId !== userId) throw AppError.notFound(`Order ${orderNumber} not found`);
  if (order.status !== 'COLLECTED') throw AppError.conflict('You can review an order once you have collected it');
  if (order.review) throw AppError.conflict('You have already reviewed this order');
  return reviewRepo.create(order.id, userId, rating, comment);
}

async function publicReviews(limit) {
  const [reviews, summary] = await Promise.all([reviewRepo.latest(limit), reportRepo.ratingSummary()]);
  return { summary, reviews };
}

module.exports = { reviewOrder, publicReviews };
