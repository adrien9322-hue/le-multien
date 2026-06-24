'use strict';

var VERSION = 'v4';
var PRECACHE = 'multien-precache-' + VERSION;
var RUNTIME = 'multien-runtime-' + VERSION;

// App shell + fonts + the membership card page (index.html covers "Ma carte")
// must work fully offline. The hero video is intentionally excluded — only
// its poster image is precached.
var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/reservations.js',
  './assets/js/carte.js',
  './assets/js/qr-creator.min.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable-512.svg',
  './img/logo noir.png',
  './img/AdobeStock_467047723.jpeg',
  './data/agenda.json',
  './fonts/Fresh-farm-Regular.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(function (cache) {
        return Promise.all(PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function () {
            // Ignore missing optional assets (e.g. font not yet provided)
            // so the rest of the app shell still installs correctly.
          });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (key) { return key !== PRECACHE && key !== RUNTIME; })
          .map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok) {
        caches.open(RUNTIME).then(function (cache) { cache.put(request, response.clone()); });
      }
      return response;
    }).catch(function () {
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.open(RUNTIME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkFetch = fetch(request).then(function (response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    });
  });
}

// Network-first for reservation submissions. If the network is unreachable,
// respond with a synthetic "offline" message the UI can display.
function networkFirstApi(request) {
  return fetch(request)
    .then(function () {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    })
    .catch(function () {
      return new Response(JSON.stringify({
        ok: false,
        message: 'Connexion requise pour réserver.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== 'GET') {
    if (url.pathname.indexOf('/api/') !== -1) {
      event.respondWith(networkFirstApi(request));
    }
    return;
  }

  // Hero video: never intercept, always go to the network.
  if (request.destination === 'video' || url.pathname.endsWith('.mp4')) {
    return;
  }

  // Agenda data: show cached version instantly, refresh in the background.
  if (url.pathname.endsWith('/data/agenda.json')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
