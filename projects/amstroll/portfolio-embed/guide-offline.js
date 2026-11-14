/* The static guide shell and its bundled photos can be opened after a first visit. */
'use strict';

const cacheName = 'amstroll-guide-shell-2';
const scope = new URL(self.registration.scope);
const shell = [
  'index.html', 'guide.css', 'guide-clock.css', 'guide-clock.js', 'guide-data.js',
  'guide-planner.js', 'guide-map.js',
  'hero/amsterdam-canals-portrait.webp', 'hero/amsterdam-canals-wide.webp',
].map(path => new URL(path, scope).href);
const local = value => {
  const url = new URL(value, scope);
  return url.origin === scope.origin && url.pathname.startsWith(scope.pathname) ? url : null;
};

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('amstroll-guide-shell-') && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-photos' || !Array.isArray(event.data.photos)) return;
  const photos = event.data.photos.slice(0, 100).map(local).filter(url => url && /\.(?:webp|jpe?g|png)$/i.test(url.pathname));
  event.waitUntil(caches.open(cacheName).then(cache => Promise.allSettled(photos.map(url => cache.add(url.href)))));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !local(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(request);
      if (response.ok && (request.mode === 'navigate' || ['script', 'style', 'image'].includes(request.destination))) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return await cache.match(request, { ignoreSearch: true }) ||
        (request.mode === 'navigate' ? await cache.match(shell[0]) : null) ||
        Response.error();
    }
  })());
});
