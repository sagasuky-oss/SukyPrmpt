// Naikkan angka versi ini setiap kali kamu mengunggah index.html baru.
const CACHE = 'penyempurna-foto-v38';
// Model deteksi wajah disimpan terpisah supaya tidak terhapus saat versi aplikasi naik.
const MODEL_CACHE = 'penyempurna-foto-model';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const MODEL_URLS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@',
  'https://storage.googleapis.com/mediapipe-models/'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MODEL_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Model deteksi wajah (CDN): disimpan saat pertama kali online, lalu dipakai dari cache (bisa offline).
  if (MODEL_URLS.some(u => req.url.startsWith(u))) {
    e.respondWith(
      caches.open(MODEL_CACHE).then(cache =>
        cache.match(req, { ignoreVary: true }).then(hit => hit || fetch(req).then(res => {
          if (res.status === 200) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  const url = new URL(req.url);
  // Sumber luar lain tidak disentuh.
  if (url.origin !== self.location.origin) return;

  // Halaman: coba jaringan dulu supaya versi baru cepat muncul, cadangan dari cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // File lain: cache dulu, jaringan sebagai cadangan.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
