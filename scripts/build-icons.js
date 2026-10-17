// 產生主畫面圖示與 favicon：node scripts/build-icons.js
// 刺蝟直接取自 src/main.js 的 HEDGEHOG、顏色取自 style.css 的 --hh-*，和遊戲裡是同一隻。
// 先寫出 SVG 原稿，再用 headless Chrome（或 Edge）截成各尺寸 PNG，不需要額外套件。
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const main = read('src/main.js');
const block = main.match(/const HEDGEHOG =([\s\S]*?);\r?\n/)[1];
const HEDGEHOG = [...block.matchAll(/'([^']*)'/g)].map((m) => m[1]).join('');
const VIEWBOX = main.match(/const HEDGEHOG_VIEWBOX = '([^']+)'/)[1];
const [vx, vy, vw, vh] = VIEWBOX.split(' ').map(Number);

const css = read('style.css');
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]+)`))[1];
const PAPER = '#f6f0e5'; // 和 manifest 的 background_color、theme-color 同色
const STYLE =
  `<style>.hh-line{stroke:${token('hh-ink')};stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round}` +
  `.hh-foot,.hh-eye{fill:${token('hh-ink')}}.hh-spine{fill:${token('hh-spine')}}.hh-face{fill:${token('hh-face')}}` +
  `.hh-blush{fill:${token('hh-blush')};opacity:.9}.hh-glint{fill:${token('hh-glint')}}</style>`;

const fmt = (n) => +n.toFixed(3);
/** 刺蝟放進 100×100 的畫布：寬 w、中心 (50, 52)（視覺上略低於正中，腳下比較穩）、歪 -4° */
const placed = (w) => {
  const s = w / vw, cx = 50, cy = 52;
  const tx = cx - w / 2 - vx * s, ty = cy - (vh * s) / 2 - vy * s;
  return `<g transform="rotate(-4 ${cx} ${cy}) translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(s)})">${HEDGEHOG}</g>`;
};
const icon = (w) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${STYLE}` +
  `<rect width="100" height="100" fill="${PAPER}"/>${placed(w)}</svg>\n`;

const svgs = {
  // 一般圖示：刺蝟佔寬 74%
  'icons/icon.svg': icon(74),
  // maskable：Android 可能裁成圓形，整隻刺蝟要在半徑 40% 的安全圓內，所以縮到 62%
  'icons/icon-maskable.svg': icon(62),
  // favicon：不留紙底、裁到剛好，16px 時才不會只剩一個點
  'icons/favicon.svg':
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${fmt(vy + vh / 2 - vw / 2)} ${vw} ${vw}">${STYLE}${HEDGEHOG}</svg>\n`,
};
for (const [p, s] of Object.entries(svgs)) writeFileSync(join(root, p), s);

const pngs = [
  ['icons/icon.svg', 'apple-touch-icon.png', 180],
  ['icons/icon.svg', 'icons/icon-192.png', 192],
  ['icons/icon.svg', 'icons/icon-512.png', 512],
  ['icons/icon-maskable.svg', 'icons/icon-maskable-512.png', 512],
];

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = process.env.CHROME ?? browsers.find(existsSync);
if (!browser) throw new Error('找不到 Chrome／Edge，請用環境變數 CHROME 指定路徑');

const tmp = mkdtempSync(join(tmpdir(), 'icons-'));
try {
  for (const [src, out, size] of pngs) {
    const page = join(tmp, 'page.html');
    writeFileSync(page,
      `<!doctype html><style>html,body{margin:0;overflow:hidden}img{display:block;width:${size}px;height:${size}px}</style>` +
      `<img src="${pathToFileURL(join(root, src))}">`);
    execFileSync(browser, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${join(tmp, 'profile')}`,
      `--window-size=${size},${size}`, `--screenshot=${join(root, out)}`, pathToFileURL(page).href,
    ], { stdio: 'ignore' });
    console.log(`${out}  ${size}×${size}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
