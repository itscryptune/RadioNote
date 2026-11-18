const CACHE = 'radionote-shell-v1';
self.addEventListener('install', event => event.waitUntil((async () => {
  const base = self.registration.scope;
  const page = await fetch(base, {cache:'reload'});
  if (!page.ok) throw new Error('Could not cache app shell');
  const markup = await page.clone().text();
  const assets = [...markup.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map(match => new URL(match[1], base).href);
  const cache = await caches.open(CACHE);
  await cache.put(base, page);
  await cache.addAll(assets);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('radionote-shell-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(self.registration.scope, response.clone());
        return response;
      } catch { return await cache.match(self.registration.scope) || Response.error(); }
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
