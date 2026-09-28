const { detectImageType } = require('../src/utils/imageType');

describe('Photo upload type check (magic bytes)', () => {
  const pad = b => Buffer.concat([b, Buffer.alloc(16)]);
  test('recognises JPEG, PNG and WebP', () => {
    expect(detectImageType(pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))).toBe('image/jpeg');
    expect(detectImageType(pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).toBe('image/png');
    expect(detectImageType(pad(Buffer.from('RIFF\0\0\0\0WEBP', 'ascii')))).toBe('image/webp');
  });
  test('rejects HTML/scripts renamed to .jpg, GIFs and tiny files', () => {
    expect(detectImageType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageType(pad(Buffer.from('GIF89a')))).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageType('not a buffer')).toBeNull();
  });
});
