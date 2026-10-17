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
/** 刺蝟：寬 w、中心 (cx, cy)、歪 -4° */
const placed = (w, cx, cy) => {
  const s = w / vw;
  const tx = cx - w / 2 - vx * s, ty = cy - (vh * s) / 2 - vy * s;
  return `<g transform="rotate(-4 ${cx} ${cy}) translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(s)})">${HEDGEHOG}</g>`;
};

/** 棋盤一角：5×5 的色塊，一般圖示只露出中間 3×3。字元對應 style.css 的 --r*。
 *  正中間站一隻刺蝟，四個斜角標 ✕（刺蝟不能斜著相鄰） */
const BOARD = ['22004', '22006', '33066', '33366', '13366'];
const MARKS = [[1, 1], [1, 3], [3, 1], [3, 3]];
const C = 100 / 3; // 一格的邊長，讓中間 3×3 剛好鋪滿畫布
const board = (k) => {
  const at = (i) => (i - 1) * C; // 第 i 格的左（上）緣，中間 3×3 是第 1～3 格
  const color = (r, c) => BOARD[r]?.[c];
  let cells = '', grid = '', edges = '', marks = '';
  // 一般圖示的畫布邊就是 0 和 100，落在邊上的線只會露出半條，不畫
  const shown = (p) => k < 1 || (p > 0.1 && p < 99.9);
  const line = (same, p, d) => { if (shown(p)) same ? (grid += d) : (edges += d); };
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    cells += `<rect x="${fmt(at(c))}" y="${fmt(at(r))}" width="${fmt(C)}" height="${fmt(C)}" fill="${token('r' + color(r, c))}"/>`;
    // 和右邊、下面那格比：同色塊畫細格線，不同色塊畫色塊邊界
    if (c < 4) line(color(r, c) === color(r, c + 1), at(c + 1), `M${fmt(at(c + 1))} ${fmt(at(r))}v${fmt(C)}`);
    if (r < 4) line(color(r, c) === color(r + 1, c), at(r + 1), `M${fmt(at(c))} ${fmt(at(r + 1))}h${fmt(C)}`);
  }
  for (const [r, c] of MARKS) {
    const x = at(c) + C / 2, y = at(r) + C / 2, d = C * 0.13;
    marks += `M${fmt(x - d)} ${fmt(y - d)}L${fmt(x + d)} ${fmt(y + d)}M${fmt(x + d)} ${fmt(y - d)}L${fmt(x - d)} ${fmt(y + d)}`;
  }
  return cells +
    `<path d="${grid}" stroke="${token('grid')}" stroke-width="1"/>` +
    `<path d="${edges}" stroke="${token('line')}" stroke-width="2.4" stroke-linecap="square"/>` +
    `<path d="${marks}" stroke="${token('queen')}" stroke-width="2.8" stroke-linecap="round" opacity=".6"/>` +
    placed(52, 50, 51);
};
/** k：整個場景以中心縮放的比例；maskable 用 0.8，四角的 ✕ 才會落在半徑 40% 的安全圓內，外圈露出更多棋盤 */
const icon = (k) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${STYLE}` +
  `<g transform="translate(50 50) scale(${k}) translate(-50 -50)">${board(k)}</g></svg>\n`;

const svgs = {
  'icons/icon.svg': icon(1),
  'icons/icon-maskable.svg': icon(0.8),
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
