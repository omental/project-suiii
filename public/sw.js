/* Project SUIII service worker: static assets only, no authenticated data caching. */
const APP_CACHE = "project-suiii-static-v4";
const SHELL_CACHE = "project-suiii-shell-v4";
const SAFE_SHELL_URLS = ["/offline.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const MAX_STATIC_ENTRIES = 96;
const PRIVATE_PATHS = [
  /^\/api\/v1\/auth\b/,
  /^\/api\/v1\/profile\b/,
  /^\/api\/v1\/sync\b/,
  /^\/api\/v1\/progress\b/,
  /^\/api\/v1\/workouts\b/,
  /^\/api\/v1\/meals\b/,
  /^\/api\/v1\/reports\b/,
  /^\/api\/v1\/photos\b/
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SAFE_SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, SHELL_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("project-suiii-") && !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_OFFLINE_CACHE") {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("project-suiii-")).map((name) => caches.delete(name)));
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SAFE_SHELL_URLS);
    })());
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;
  if (isPrivateRequest(url, request) || isNextPrivatePayload(url, request)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }

  if (isSafeStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

function isPrivateRequest(url, request) {
  if (PRIVATE_PATHS.some((pattern) => pattern.test(url.pathname))) return true;
  if (request.headers.has("Authorization") || request.headers.has("X-CSRF-Token")) return true;
  if (request.headers.has("Cookie")) return true;
  return false;
}

function isNextPrivatePayload(url, request) {
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.has("RSC")) return true;
  if (request.headers.has("Next-Router-State-Tree")) return true;
  if (request.headers.has("Next-Url")) return true;
  if (request.headers.has("Next-Action")) return true;
  if (request.headers.get("Purpose") === "prefetch") return true;
  if (request.headers.get("Sec-Purpose")?.includes("prefetch")) return true;
  return false;
}

function isSafeStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html" ||
    /\.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname);
}

async function networkOnlyNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match("/offline.html")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const contentType = response.headers.get("Content-Type") || "";
  if (response && response.ok && response.type !== "opaque" && !contentType.includes("text/html")) {
    await cache.put(request, response.clone());
    await trimCache(cache, MAX_STATIC_ENTRIES);
  }
  return response;
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}
