// Image decoding and encoding. Browser only (canvas).

const MAX_SIDE = 4096;
const THUMB_SIDE = 480;
const KEEP_TYPES = ['image/png', 'image/webp', 'image/gif'];

function canvasFrom(bitmap, width, height, background) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), type, quality);
  });
}

function fit(width, height, maxSide) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return [Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio))];
}

/**
 * Prepare an image chosen by the user.
 * JPEG files are re-encoded so that the EXIF orientation is applied once and
 * for all; very large images are reduced.
 */
export async function prepareImage(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const [width, height] = fit(bitmap.width, bitmap.height, MAX_SIDE);
    const keep = KEEP_TYPES.includes(blob.type) && width === bitmap.width;
    const image = keep
      ? blob
      : await canvasToBlob(canvasFrom(bitmap, width, height, '#fff'), 'image/jpeg', 0.9);
    const [thumbWidth, thumbHeight] = fit(width, height, THUMB_SIDE);
    const thumb = canvasFrom(bitmap, thumbWidth, thumbHeight, '#fff').toDataURL('image/jpeg', 0.8);
    return { image, width, height, thumb };
  } finally {
    bitmap.close();
  }
}

/** JPEG version of an image, for the formats that require it. */
export async function toJpeg(blob, quality = 0.85) {
  const bitmap = await createImageBitmap(blob);
  try {
    return await canvasToBlob(canvasFrom(bitmap, bitmap.width, bitmap.height, '#fff'), 'image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function blobToBase64(blob) {
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}

export function dataUrlToBlob(dataUrl) {
  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.*)$/s);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  return base64ToBlob(match[2], match[1]);
}

/** Trigger the download of a generated file. */
export function download(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
