const cacheName = 'joyvelope-v3';
const staticFiles = ['./', './index.html', './styles.css', './app.js', './config.js', './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(staticFiles)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('joyvelope-') && key !== cacheName).map((key) => caches.delete(key))))
  ]));
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request).then((response) => response || Response.error())));
});
