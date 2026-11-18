const CACHE = 'radionote-shell-v2';
self.addEventListener('install', event => event.waitUntil((async () => {
  const base = self.registration.scope;
  const page = await fetch(base, {cache:'reload'});
  if (!page.ok) throw new Error('Could not cache RadioNote');
  const html = await page.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map(match => new URL(match[1], base).href);
  const cache = await caches.open(CACHE);
  await cache.put(base, page);
  await cache.addAll(assets);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('radionote-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = event.request.mode === 'navigate';
    const isCode = ['script','style'].includes(event.request.destination);
    const key = isPage ? self.registration.scope : event.request;
    if (isPage || isCode) {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(key, response.clone());
        return response;
      } catch { return await cache.match(key) || Response.error(); }
    }
    const saved = await cache.match(event.request);
    if (saved) return saved;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch { return Response.error(); }
  })());
});
