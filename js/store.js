// Local storage of the documents in IndexedDB. Nothing leaves the browser.
// Images are kept in their own object store so that saving a document while
// editing never rewrites the image.

const DB_NAME = 'xia-express';
const DB_VERSION = 1;
const DOCS = 'docs';
const IMAGES = 'images';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DOCS)) {
          db.createObjectStore(DOCS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(IMAGES)) {
          db.createObjectStore(IMAGES, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

/** Run `work` in a transaction and resolve with its result once committed. */
async function transaction(stores, mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = work(tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

function request(idbRequest) {
  return new Promise((resolve, reject) => {
    idbRequest.onsuccess = () => resolve(idbRequest.result);
    idbRequest.onerror = () => reject(idbRequest.error);
  });
}

/** All documents with their thumbnail, without the images. */
export async function listDocuments() {
  return transaction([DOCS], 'readonly', (tx) => request(tx.objectStore(DOCS).getAll()));
}

/** A document with its image, or null. */
export async function getDocument(id) {
  const [record, image] = await transaction([DOCS, IMAGES], 'readonly', (tx) => Promise.all([
    request(tx.objectStore(DOCS).get(id)),
    request(tx.objectStore(IMAGES).get(id)),
  ]));
  if (!record || !image) {
    return null;
  }
  return { doc: record.doc, thumb: record.thumb, image: image.blob };
}

export async function createDocument(doc, imageBlob, thumb) {
  await transaction([DOCS, IMAGES], 'readwrite', (tx) => {
    tx.objectStore(DOCS).put({ id: doc.id, doc, thumb, updated: Date.now() });
    tx.objectStore(IMAGES).put({ id: doc.id, blob: imageBlob });
  });
  // Ask the browser not to evict the data under storage pressure.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

/** Save a document, keeping its image and thumbnail. */
export async function saveDocument(doc) {
  await transaction([DOCS], 'readwrite', (tx) => {
    const store = tx.objectStore(DOCS);
    const get = store.get(doc.id);
    get.onsuccess = () => {
      if (get.result) {
        store.put({ ...get.result, doc, updated: Date.now() });
      }
    };
  });
}

export async function deleteDocument(id) {
  await transaction([DOCS, IMAGES], 'readwrite', (tx) => {
    tx.objectStore(DOCS).delete(id);
    tx.objectStore(IMAGES).delete(id);
  });
}
