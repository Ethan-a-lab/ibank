/* iBank Service Worker —— 只为「装成桌面应用 + 弱网可用」服务，不改变业务逻辑
 *
 * 三条策略，按「会不会和 HTML 结构打架」来分流：
 *   1. 页面导航：网络优先，断网/超时回退缓存 —— 打开永远是线上最新内容
 *   2. app.css / app-core.js / app-auth.js：也走网络优先（1.5s 超时回退缓存）
 *      ★ 这三个文件与 index.html 的 DOM id 强耦合，若用「缓存优先」，
 *        会出现「新 HTML + 旧 JS」混搭，旧 JS 找不到新 DOM 节点而报错。
 *        宁可多一次协商请求（有 ETag，多数情况是 304），也不接受混搭。
 *   3. 图标 / 吉祥物等纯图片：缓存优先 —— 不参与逻辑，快就完事
 *   4. 跨域请求（CloudBase 登录 SDK / 接口）与 POST：完全不拦截，避免登录态被缓存污染
 *
 * 更新方式：改完站点直接 push 即可，用户下次打开自动拿到新版（无需改版本号）。
 * 只有改动本文件的缓存策略或预缓存清单时，才需要把 CACHE_VERSION 加一。
 *
 * 注意：Service Worker 只在 https 或 localhost 下生效；双击 file:// 打开时注册会被跳过。
 */

const CACHE_VERSION = 'ibank-v3';   // v87：改了 app.css（.ev-status:empty、换组按钮待确认态），靠版本号把旧壳挤掉
const CACHE_NAME = `ibank-shell-${CACHE_VERSION}`;

/* ★总开关：想把 PWA 停掉，只把这个 true 改成 false，然后推送一次。
 *
 * 为什么不能直接删这个文件：已装过应用的用户，浏览器里那份 Service Worker 不会因为
 * 文件 404 就消失，它会继续用旧缓存给你端页面——你会以为改回来了，其实用户看到的是
 * 几天前的版本。所以退场必须由"新版本 SW 自己执行"。
 *
 * 改成 false 后发生什么（已实测，见 _private/probe_rollback.mjs）：
 *   1. 新 SW 装上来，install 不再预缓存，fetch 不再拦截任何请求
 *   2. activate 清空全部缓存 -> 注销自己 -> 让所有已打开/已安装的窗口重新加载
 *   3. 用户那边就是普通网页了，不会再被旧缓存困住
 * 之后你可以过几天再从容删掉 sw.js / manifest / 图标，或整个 revert 这次提交。
 */
const PWA_ENABLED = true;

// 应用外壳：首次安装时预缓存，断网也能打开
const PRECACHE_URLS = [
  './',
  './index.html',
  './ibank-game.html',
  './manifest.webmanifest',
  './static/app.css',
  './static/app-core.js',
  './static/app-auth.js',
  './static/mascot/panda.png',
  './static/mascot/panda@2x.png',
  './static/icons/icon-192.png',
  './static/icons/icon-512.png'
];

// 与 HTML 结构强耦合、必须跟随线上最新的资源（后缀匹配，兼容 /ibank/ 子路径与将来换域名）
const NETWORK_FIRST_ASSET = /\/static\/(app\.css|app-core\.js|app-auth\.js)$/;

/* 只缓存"应用外壳"类资源。白名单之外一律放行，不进缓存。
 *
 * 为什么必须白名单而不是黑名单：assets/ 下放的是教材 PDF（受著作权保护，且单个 74MB）。
 * 若按"同源 GET 全缓存"处理，学生点一次就会把整本教材复制进浏览器缓存——
 * 既占设备空间，也等于把第三方作品实质复制到用户设备上，
 * 对一个要送审的课程项目来说，这种风险没必要承担。字体/图片才是需要离线的小东西。
 */
const CACHEABLE_ASSET = /\.(png|jpe?g|gif|svg|webp|ico|css|js|json|webmanifest|woff2?|ttf|otf)$/i;

const NAV_TIMEOUT = 4000;   // 导航等待网络的上限：超时即回退缓存，避免弱网白屏干等
const ASSET_TIMEOUT = 1500; // 静态脚本/CSS 的上限：超时先用缓存渲染，后台继续下载新版

self.addEventListener('install', (event) => {
  // 退场模式：不预缓存任何东西，直接进入 activate 执行清理
  if (!PWA_ENABLED) {
    self.skipWaiting();
    return;
  }
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 逐个 add 并吞掉单个失败：某个文件 404 不该让整包安装失败
    await Promise.all(PRECACHE_URLS.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

/** 退场：清空缓存 -> 注销自己 -> 让所有窗口重新加载，回到纯网页状态 */
async function retire() {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  try {
    await self.registration.unregister();
  } catch (e) { /* 已注销则忽略 */ }
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.navigate(c.url).catch(() => {}));
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (!PWA_ENABLED) {
      await retire();
      return;
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

/** 网络优先 + 超时回退缓存，用于页面导航。
 *  缓存键统一用 pathname（去掉 ?source=pwa 这类查询串），避免同一个页面被存成多份。
 *  不同页面各存各的键：ibank-game.html 不会覆盖首页缓存。 */
async function networkFirstNavigation(request) {
  const url = new URL(request.url);
  const key = new Request(url.origin + url.pathname);
  const cache = await caches.open(CACHE_NAME);
  // 回退顺序：本页缓存 -> 首页缓存（站内导航断网时至少能回到能用的首页）
  const cached = (await cache.match(key)) || (await cache.match(new Request(new URL('./', url).href)));

  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(key, res.clone()).catch(() => {});
    return res;
  });

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT));

  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
    network.catch(() => {}); // 超时后让网络继续在后台落盘
    return cached || network;
  } catch (e) {
    return cached || Response.error();
  }
}

/** 网络优先 + 超时回退缓存，用于与 DOM 强耦合的 css/js */
async function networkFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
    return res;
  });

  if (!cached) return network.catch(() => Response.error()); // 首次访问没有兜底，只能等网络

  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), ASSET_TIMEOUT));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
    network.catch(() => {});
    return cached;
  } catch (e) {
    return cached;
  }
}

/** 缓存优先 + 后台更新，用于图片类静态资源 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const revalidate = fetch(request).then((res) => {
    // 只缓存同源、状态正常的响应；opaque 响应（跨域）不落盘
    if (res && res.ok && res.type === 'basic') {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);

  if (cached) {
    revalidate; // 后台更新，不阻塞本次响应
    return cached;
  }
  const fresh = await revalidate;
  return fresh || Response.error();
}

self.addEventListener('fetch', (event) => {
  // 退场模式：一律放行，让浏览器直接走网络
  if (!PWA_ENABLED) return;

  const req = event.request;

  // 只处理 GET；POST 等一律放行（登录、答题提交都不能被缓存）
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 跨域（CloudBase SDK、第三方接口）与 chrome-extension 等一律放行
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  if (NETWORK_FIRST_ASSET.test(url.pathname)) {
    event.respondWith(networkFirstAsset(req));
    return;
  }

  // 白名单之外（PDF、压缩包、音视频、大文件等）不拦截、不缓存，直接走网络
  if (!CACHEABLE_ASSET.test(url.pathname)) return;

  event.respondWith(cacheFirst(req));
});
