const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const menuRepo = require('../repositories/menuRepository');

async function getItem(id) {
  const item = await menuRepo.findById(id);
  if (!item) throw AppError.notFound('Menu item not found');
  return item;
}

async function saveItem(id, data) {
  if (data.salePrice != null && data.salePrice >= data.price) {
    throw AppError.badRequest('Sale price must be lower than the normal price', [{ field: 'salePrice', message: 'Must be lower than price' }]);
  }
  return withTransaction(async client => {
    const saved = id ? await menuRepo.update(id, data, client) : await menuRepo.create(data, client);
    if (!saved) throw AppError.notFound('Menu item not found');
    if (data.extras) await menuRepo.replaceExtras(saved.id, data.extras, client);
    return menuRepo.findById(saved.id, client);
  });
}

async function deleteItem(id) {
  if (await menuRepo.hasOrders(id)) {
    throw AppError.conflict('This item has past orders. Mark it as sold out instead of deleting it.');
  }
  const removed = await menuRepo.remove(id);
  if (!removed) throw AppError.notFound('Menu item not found');
}

async function setAvailability(id, available) {
  const updated = await menuRepo.setAvailability(id, available);
  if (!updated) throw AppError.notFound('Menu item not found');
  return updated;
}

module.exports = { list: menuRepo.list, getItem, saveItem, deleteItem, setAvailability };
