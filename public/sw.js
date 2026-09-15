const CACHE = 'rhdp-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

// So cacheia o "shell" do app (mesma origem). Chamadas ao Supabase passam direto,
// nunca servidas do cache, pra nao mostrar dado desatualizado.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((resposta) => {
        const copia = resposta.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copia))
        return resposta
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
  )
})
