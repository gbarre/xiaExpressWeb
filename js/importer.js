// Create documents from files: images, Xia Express XML and standalone HTML.

import { base64ToBlob, dataUrlToBlob, prepareImage } from './images.js';
import { newDocument, newId, sanitizeDocument } from './model.js';
import { parseStandaloneHtml, parseXiaXml } from './exporter.js';
import { createDocument, getDocument } from './store.js';
import { t } from './i18n.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPT_IMAGES = IMAGE_TYPES.join(',');
export const ACCEPT_IMPORT = '.xml,.html,.htm,application/xml,text/xml,text/html';

function baseName(fileName) {
  return String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

async function fromParsed(raw, imageBlob) {
  const { image, width, height, thumb } = await prepareImage(imageBlob);
  // The real size of the image always wins over what the file declares.
  const doc = sanitizeDocument({ ...raw, image: { ...raw.image, width, height } });
  await createDocument(doc, image, thumb);
  return doc.id;
}

/** Import one file and return the identifier of the new document. */
export async function importFile(file) {
  const name = file.name || '';
  if (IMAGE_TYPES.includes(file.type)) {
    let prepared;
    try {
      prepared = await prepareImage(file);
    } catch {
      throw new Error(t('imageFailed'));
    }
    const doc = newDocument({ title: baseName(name), width: prepared.width, height: prepared.height });
    await createDocument(doc, prepared.image, prepared.thumb);
    return doc.id;
  }
  const text = await file.text();
  if (/\.html?$/i.test(name) || file.type === 'text/html') {
    const { raw, imageDataUrl } = parseStandaloneHtml(text);
    return fromParsed(raw, dataUrlToBlob(imageDataUrl));
  }
  const { raw, imageBase64 } = parseXiaXml(text);
  return fromParsed(raw, base64ToBlob(imageBase64, 'image/jpeg'));
}

/** Copy a document and return the identifier of the copy. */
export async function duplicateDocument(id) {
  const record = await getDocument(id);
  if (!record) {
    throw new Error(t('notFound'));
  }
  const doc = structuredClone(record.doc);
  doc.id = newId();
  doc.title = `${doc.title || t('untitled')} ${t('copySuffix')}`;
  await createDocument(doc, record.image, record.thumb);
  return doc.id;
}
