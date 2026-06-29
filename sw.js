// ═══════════════════════════════════════════════════════════════
// SMARTPERA PASSPORT — Service Worker
// Handles offline caching so the app loads even without internet
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = "sp-passport-v1";
const CACHE_URLS = [
  "/FinancePassport/",
  "/FinancePassport/index.html",
  "/FinancePassport/register.html",
  "/FinancePassport/dashboard.html",
  "/FinancePassport/manifest.json",
  "/FinancePassport/firebase-config.js"
];

// ── Install: cache core files ───────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Always network-first for Firebase API calls
  if (url.hostname.includes("firebase") || url.hostname.includes("googleapis")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Cache-first for Passport files
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful, same-origin responses
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // If network fails and no cache: show offline page for HTML requests
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("/FinancePassport/index.html");
        }
      });
    })
  );
});
