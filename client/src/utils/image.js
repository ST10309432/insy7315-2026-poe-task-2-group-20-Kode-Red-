/**
 * Shrink a photo in the browser before uploading (max 1000px, WebP or JPEG),
 * so a 5 MB phone photo becomes ~100 KB and loads fast on mobile data.
 */
export async function resizeImage(file, maxSize = 1000) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error('Please choose a JPEG, PNG or WebP photo');
  }
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('That photo could not be read. Try a JPEG or PNG.'); });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = type => new Promise(res => canvas.toBlob(res, type, 0.82));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg'); // Safari fallback
  if (blob.size > 1024 * 1024) throw new Error('Photo is still larger than 1 MB after resizing');
  return blob;
}
