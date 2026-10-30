const CACHE_NAME = "medicare-pwa-v1";

const PRECACHE_ASSETS = [
    "/",
    "/index.html",
    "/offline.html",
    "/style.css",
    "/app.js",
    "/config.js",
    "/i18n.js",
    "/jsQR.js",
    "/appointmentTimeline.js",
    "/react-is-shim.js",
    "/manifest.json",
    "/icon.svg",
    "/pwa-192x192.png",
    "/pwa-512x512.png",
    "/pwa-maskable-512x512.png",
    "/apple-touch-icon.png"
];

// Install Event - Precache core application shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn("[SW] Precache partial error (non-fatal):", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Dynamic routing and offline fallbacks
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle HTTP/HTTPS GET requests
    if (req.method !== "GET") {
        return;
    }

    // Emergency Directory: Network first with offline cache fallback
    if (url.pathname === "/api/helper/emergency-directory") {
        event.respondWith(
            fetch(req).then((networkResp) => {
                if (networkResp && networkResp.status === 200) {
                    const clone = networkResp.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return networkResp;
            }).catch(async () => {
                const cached = await caches.match(req);
                if (cached) return cached;
                return new Response(
                    JSON.stringify({
                        success: false,
                        offline: true,
                        message: "Offline: using device local storage emergency cache."
                    }),
                    { headers: { "Content-Type": "application/json" } }
                );
            })
        );
        return;
    }

    // Generic API calls: Network first; if offline, return structured offline response
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(req).catch(() => {
                return new Response(
                    JSON.stringify({
                        success: false,
                        offline: true,
                        message: "Internet unavailable. Using offline emergency cache on this device."
                    }),
                    {
                        headers: { "Content-Type": "application/json" }
                    }
                );
            })
        );
        return;
    }

    // HTML Navigation requests: Network first, fallback to cached index.html or offline.html
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedIndex = await cache.match("/index.html");
                if (cachedIndex) return cachedIndex;
                const cachedOffline = await cache.match("/offline.html");
                if (cachedOffline) return cachedOffline;
                return new Response("Offline mode active.", { status: 503, headers: { "Content-Type": "text/plain" } });
            })
        );
        return;
    }

    // Static Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(req).then((cachedResp) => {
            const fetchPromise = fetch(req).then((networkResp) => {
                if (networkResp && networkResp.status === 200) {
                    const respClone = networkResp.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(req, respClone);
                    });
                }
                return networkResp;
            }).catch(() => null);

            return cachedResp || fetchPromise;
        })
    );
});
