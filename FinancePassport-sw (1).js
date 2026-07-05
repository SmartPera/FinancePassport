// ═══════════════════════════════════════════════════════════════
// SMARTPERA PASSPORT — Service Worker
// Handles offline caching so the app loads even without internet
// ═══════════════════════════════════════════════════════════════

// Bump this version string on every deploy that changes any cached file.
// This is what forces old caches to be deleted (see "activate" below).
const CACHE_NAME = "sp-passport-v2";
const CACHE_URLS = [
  "/FinancePassport/manifest.json",
  "/FinancePassport/icons/favicon-32.png",
  "/FinancePassport/icons/favicon-16.png",
  "/FinancePassport/icons/apple-touch-icon.png",
  "/FinancePassport/icons/icon-192.png",
  "/FinancePassport/icons/icon-512.png"
];

// ── Install: cache only static, rarely-changing assets ──────────
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

// ── Fetch: network-first for HTML/API, cache-first only for static assets ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Always network-only for Firebase API calls — never cache live data.
  if (url.hostname.includes("firebase") || url.hostname.includes("googleapis")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Network-first for HTML documents and JS: users always get the latest
  // deploy when online. Falls back to cache only if the network fails.
  const isHTML = event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html");
  const isScript = url.pathname.endsWith(".js");
  if (isHTML || isScript) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("/FinancePassport/index.html")))
    );
    return;
  }

  // Cache-first for genuinely static assets (icons, manifest) only.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
