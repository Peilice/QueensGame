// 離線遊玩：安裝時把整個遊戲存進快取，之後沒有網路也能打開。
// 有網路時一律先抓最新版（和沒有 service worker 時一樣），抓不到或太慢才拿快取，
// 所以每次部署不必手動改版號；PRECACHE 只要和實際檔案一致即可（test/sw.test.js 會檢查）。

const CACHE = 'hedgehog-v1';
const FONT_CACHE = 'hedgehog-fonts';
const TIMEOUT_MS = 4000;

const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'doodles.svg',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'src/game.js',
  'src/generator.js',
  'src/main.js',
  'src/puzzles.js',
  'src/rules.js',
  'src/solver.js',
  'src/sound.js',
  'src/storage.js',
  'src/tips.js',
  'src/tutorial.js',
];

// 字型來自 Google Fonts，第一次載入後存起來；離線又沒存到時退回系統字
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  // cache: 'reload' 繞過瀏覽器的 HTTP 快取，確保存進去的是伺服器上的最新版
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request));
  else if (url.origin === self.location.origin) event.respondWith(networkFirst(request, event));
});

/** 先抓網路並更新快取；離線或逾時就拿快取（網址後的 ?v=3 之類不影響比對） */
async function networkFirst(request, event) {
  const cache = await caches.open(CACHE);
  const network = fetch(request);
  // 回應先給了快取時，網路那邊抓完仍要存進快取
  event.waitUntil(
    network.then((response) => response.ok && cache.put(request, response.clone())).catch(() => {}),
  );
  const cached = () =>
    cache.match(request, { ignoreSearch: true }).then(
      // 各種網址的頁面（帶 #、?）都退回同一個 index.html
      (hit) => hit || (request.mode === 'navigate' ? cache.match('index.html') : undefined),
    );
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));

  // 網路太慢時先給快取；快取也沒有就繼續等網路
  const first = await Promise.race([network.catch(() => null), timeout]);
  if (first) return first;
  return (await cached()) || network;
}

async function cacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // 跨網域的字型 CSS 可能是 opaque（status 0），一樣存起來
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}
