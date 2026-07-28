// Service Worker - 人生管理计划工作台
// 实现离线缓存：首次访问后，无网络也能打开
const CACHE_NAME = 'life-dashboard-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-256.png',
  './icon-512.png',
  './maskable-192.png',
  './maskable-256.png',
  './maskable-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Chart.js 走 CDN：采用「网络优先，失败回退缓存」策略，保证能用最新版
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 同源资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        // 缓存新获取的同源资源
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
