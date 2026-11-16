const cacheName = 'joyvelope-v5';
const staticFiles = ['./', './index.html', './styles.css', './app.js', './experiences.js', './experiences.css', './config.js', './icon.svg', './manifest.webmanifest', './assets/anniversary.png', './assets/birthday-midnight.png', './assets/birthday-party.png', './assets/birthday-secret.png', './assets/bunny-sorry.png', './assets/bunny.png', './assets/cat.png', './assets/love-mail.png', './assets/panda-sorry.png', './assets/panda.png', './assets/penguin.png', './assets/rose-gift.png', './assets/teddy.png'];

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
