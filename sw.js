// Service worker: makes the application usable offline.
// Strategy: network first, so that a new version is picked up as soon as it
// is deployed; the cache is only used when the network is unreachable.

const CACHE = 'xia-express-v2';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/player.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/collection.js',
  'js/config.js',
  'js/dialogs.js',
  'js/editor.js',
  'js/exporter.js',
  'js/i18n.js',
  'js/images.js',
  'js/importer.js',
  'js/legacy.js',
  'js/markdown.js',
  'js/model.js',
  'js/player.js',
  'js/shapes.js',
  'js/stats.js',
  'js/store.js',
  'js/ui.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) => cached || Response.error())),
  );
});
