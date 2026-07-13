/* BRITIME — service worker v3
   - stran (index.html) se vedno najprej poskusi z mreže → posodobitve pridejo takoj brez ponovne namestitve
   - ikone, manifest in knjižnice iz predpomnilnika → aplikacija deluje tudi brez interneta */
const CACHE = 'britime-v3';
const CORE = [
  './',
  './index.html',
  './firebase-config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const isNav = e.request.mode === 'navigate'
    || e.request.url.endsWith('/index.html')
    || e.request.url.endsWith('/firebase-config.js');

  if (isNav) {
    /* najprej mreža (sveža verzija), predpomnilnik kot rezerva brez interneta */
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() =>
        caches.match(e.request).then(hit => hit || caches.match('./index.html'))
      )
    );
    return;
  }

  /* ostalo: najprej predpomnilnik, mrežne odgovore shrani za naslednjič */
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      });
    })
  );
});
