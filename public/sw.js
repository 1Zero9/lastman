// Private competition data stays network-only. Cache only static files so an
// installed app starts cleanly without ever serving a stale pick or result.
const VERSION = "lms-static-v0.4.1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/lms-logo.png", "/offline.html"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(STATIC_ASSETS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/_next/static/") && !/\.(?:css|js|svg|png|jpg|jpeg|webp|woff2)$/.test(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(VERSION).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
