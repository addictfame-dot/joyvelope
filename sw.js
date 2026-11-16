const cacheName = 'joyvelope-ref2';
const staticFiles = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './experiences.js?v=ref2',
  './experiences.css?v=ref2',
  './config.js',
  './icon.svg',
  './manifest.webmanifest',
  './assets/cat.png',
  './assets/ref-anniversary-texture.png',
  './assets/ref-bunny-scrapbook.png',
  './assets/ref-bunny.png',
  './assets/ref-cream-paper.png',
  './assets/ref-envelope.png',
  './assets/ref-floral.png',
  './assets/ref-love-red.png',
  './assets/ref-midnight-stars.png',
  './assets/ref-panda-flowers.png',
  './assets/ref-panda.png',
  './assets/ref-paper-grain.png',
  './assets/ref-party-lit.png',
  './assets/ref-party-night.png',
  './assets/ref-party-paper.png',
  './assets/ref-penguin.png',
  './assets/ref-ribbon.png',
  './assets/ref-rose-box.png',
  './assets/ref-secret-paper.png',
  './assets/ref-teddy.png',
  './assets/ref-velvet.png',
];

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
