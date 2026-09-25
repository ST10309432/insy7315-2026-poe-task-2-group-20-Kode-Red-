const reportRepo = require('../repositories/reportRepository');

async function dashboard() {
  return reportRepo.todaySummary();
}

async function weekly(days = 7) {
  const [salesByDay, topSellers, paymentMix, summary, ratings] = await Promise.all([
    reportRepo.salesByDay(days), reportRepo.topSellers(days), reportRepo.paymentMix(days), reportRepo.todaySummary(),
    reportRepo.ratingSummary(),
  ]);
  const totalSales = salesByDay.reduce((s, d) => s + d.sales, 0);
  const totalOrders = salesByDay.reduce((s, d) => s + d.orders, 0);
  return { days, totalSales, totalOrders, averageOrder: totalOrders ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
    salesByDay, topSellers, paymentMix, creditOwed: summary.creditOwed, ratings };
}

module.exports = { dashboard, weekly };
