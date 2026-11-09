// WikiPig service worker — acesso offline.
// Estratégia:
//  - install: baixa todas as páginas, tópicos e fotos (lista em /api/precache) + shell.
//  - navegações (HTML): network-first, cai pro cache offline.
//  - _next/static e imagens: cache-first (imutável/estável), preenche em runtime.
//  - demais GET same-origin: stale-while-revalidate.

const VERSION = "wikipig-v1";
const CORE = `${VERSION}-core`;
const RUNTIME = `${VERSION}-runtime`;

const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE);
      // Core primeiro (tolerante a falha individual).
      await cacheAllSettled(cache, CORE_ASSETS);
      // Lista dinâmica de conteúdo.
      try {
        const res = await fetch("/api/precache", { cache: "no-store" });
        if (res.ok) {
          const { urls } = await res.json();
          if (Array.isArray(urls)) await cacheAllSettled(cache, urls);
        }
      } catch {
        // Sem rede no install: segue com o que deu.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear área admin / auth / precache.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname === "/api/precache"
  ) {
    return;
  }

  // Navegações de página: network-first com fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets imutáveis do Next e imagens: cache-first.
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Resto: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req));
});

async function cacheAllSettled(cache, urls) {
  await Promise.allSettled(
    urls.map(async (u) => {
      try {
        const res = await fetch(u, { cache: "no-store" });
        if (res.ok) await cache.put(u, res.clone());
      } catch {
        /* ignora individual */
      }
    }),
  );
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached =
      (await cache.match(req)) || (await caches.match(req));
    if (cached) return cached;
    const offline = await caches.match("/offline");
    return (
      offline ||
      new Response("Offline e sem cópia salva desta página.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME);
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}
