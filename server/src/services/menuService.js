const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const menuRepo = require('../repositories/menuRepository');
const { detectImageType } = require('../utils/imageType');

const MAX_IMAGE_BYTES = 1024 * 1024;

async function list(filters) {
  await menuRepo.resetDailySoldOut();
  return menuRepo.list(filters);
}

async function getItem(id) {
  await menuRepo.resetDailySoldOut();
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

async function setAvailability(id, available, scope) {
  const updated = await menuRepo.setAvailability(id, available, scope);
  if (!updated) throw AppError.notFound('Menu item not found');
  return updated;
}

async function saveImage(id, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw AppError.badRequest('Send the photo as the request body (JPEG, PNG or WebP)');
  if (buffer.length > MAX_IMAGE_BYTES) throw new AppError(413, 'Photo is too large. The maximum is 1 MB.');
  const mime = detectImageType(buffer);
  if (!mime) throw new AppError(415, 'Only JPEG, PNG or WebP photos are allowed');
  await getItem(id); // 404 if the item doesn't exist
  const etag = crypto.createHash('sha256').update(buffer).digest('hex');
  await menuRepo.saveImage(id, mime, buffer, etag);
  return menuRepo.findById(id);
}

async function getImage(id) {
  const image = await menuRepo.getImage(id);
  if (!image) throw AppError.notFound('This item has no photo');
  return image;
}

async function deleteImage(id) {
  if (!(await menuRepo.deleteImage(id))) throw AppError.notFound('This item has no photo');
}

module.exports = { list, getItem, saveItem, deleteItem, setAvailability, saveImage, getImage, deleteImage,
  resetDailySoldOut: menuRepo.resetDailySoldOut };
