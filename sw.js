const CACHE = "budget-v3";

const STATIC_ASSETS = [
  "/budget/",
  "/budget/index.html",
  "/budget/manifest.json",
  "/budget/apple-touch-icon.png"
];

const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/tabler-icons.min.css",
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/fonts/tabler-icons.woff2"
];

// ── INSTALL: cache everything upfront ──
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([...STATIC_ASSETS, ...CDN_ASSETS]))
  );
  self.skipWaiting();
});

// ── ACTIVATE: nuke old caches ──
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ──
self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Never intercept Supabase API calls — always needs live data
  if (url.includes("supabase.co")) return;

  // CDN assets — cache first (they're versioned/immutable)
  if (url.includes("cdn.jsdelivr.net")) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // App shell — network first, cache fallback
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
