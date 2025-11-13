const CACHE_VERSION = "v1-gatishil";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/", // landing
  "/favicon.ico",
  "/logo.png",
  "/apple-touch-icon.png",
  "/site.webmanifest"
];

// Install: pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        // Ignore install cache failures so SW still activates
        console.error("SW install cache error", err);
      }
    })()
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - HTML/navigation → network-first, fallback to cache
// - Other GET (CSS/JS/images) → cache-first, then network
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const acceptHeader = request.headers.get("accept") || "";

  // HTML navigation requests
  const isHTMLRequest =
    request.mode === "navigate" ||
    acceptHeader.includes("text/html");

  if (isHTMLRequest) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback to cached landing page if nothing else
          return caches.match("/");
        }
      })()
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts) → cache-first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // Last-resort fallback
        return caches.match("/");
      }
    })()
  );
});

// Basic push support (Lighthouse "Push notifications" audit)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Gatishil Nepal";
  const body =
    data.body ||
    "Democracy that flows, not stagnates. Open to see today’s awakening.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: data.url || "https://www.gatishilnepal.org"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "https://www.gatishilnepal.org";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
