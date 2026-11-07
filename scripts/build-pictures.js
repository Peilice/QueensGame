// 把題目分進拼圖：node scripts/build-pictures.js
// src/pictures.js 裡 levels 還是空陣列的拼圖，從還沒被任何一幅用到的題目裡分一批給它；
// 已經分好的拼圖完全不動（玩家的碎片才不會換到別幅去），test/pictures-lock.json 會記下來，npm test 會檢查只能往後加。
//
// 分法：同一批新拼圖一起分。照 scripts/rate-puzzles.js 的分數由易到難排好，切成「一幅幾片」那麼多層，
// 每層每幅各拿一題，所以每一幅都是難易混著；最後把每幅裡的位置洗亂。
// 編號最前面的舊題（改版前的 50 題）先集中分給最前面幾幅，舊存檔破過的題才會落在一開始的拼圖裡。
// 加新拼圖的步驟：先 add-puzzles 加題（題數是片數的倍數）、把插圖放進 pictures/、在 src/pictures.js 那個尺寸最後面加一筆
// { id, title, book, levels: [] }，再跑這支。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUZZLES } from '../src/puzzles.js';
import { PICTURES, GRID, BOOKS } from '../src/pictures.js';
import { seeded, hashSeed } from '../src/jigsaw.js';
import { rate } from './rate-puzzles.js';

// 改版前每個尺寸的題數：這些題目優先分給最前面的拼圖
const LEGACY = 50;

function shuffle(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 把 puzzles（題目編號）分給 count 幅、每幅 per 片，難易分層 */
function deal(size, puzzles, count, per, rnd) {
  const scored = puzzles.map((i) => ({ i, score: rate(PUZZLES[size][i])?.score ?? 0 }));
  scored.sort((a, b) => a.score - b.score || a.i - b.i);
  const out = Array.from({ length: count }, () => []);
  for (let layer = 0; layer < per; layer++) {
    const band = shuffle(scored.slice(layer * count, (layer + 1) * count), rnd);
    band.forEach((p, k) => out[k].push(p.i));
  }
  return out.map((levels) => shuffle(levels, rnd));
}

for (const [key, list] of Object.entries(PICTURES)) {
  const size = Number(key);
  const per = GRID[size] ** 2;
  const used = new Set(list.flatMap((p) => p.levels));
  const fresh = list.filter((p) => p.levels.length === 0);
  if (!fresh.length) continue;
  let free = PUZZLES[size].map((_, i) => i).filter((i) => !used.has(i));
  if (free.length < fresh.length * per) {
    throw new Error(`${size}×${size}：${fresh.length} 幅新拼圖要 ${fresh.length * per} 題，只剩 ${free.length} 題沒分，先跑 add-puzzles`);
  }
  free = free.slice(0, fresh.length * per);
  const rnd = seeded(hashSeed(`${size}:${fresh[0].id}`));

  // 舊題先湊滿最前面幾幅（不夠一幅的部分用新題補齊），剩下的新拼圖再一起分
  const legacy = free.filter((i) => i < LEGACY).length;
  const first = Math.min(fresh.length, Math.ceil(legacy / per));
  const groups = legacy ? [[0, first], [first, fresh.length]] : [[0, fresh.length]];
  for (const [from, to] of groups) {
    if (from === to) continue;
    const dealt = deal(size, free.slice(from * per, to * per), to - from, per, rnd);
    dealt.forEach((levels, k) => (fresh[from + k].levels = levels));
  }
  console.log(`${size}×${size}：分好 ${fresh.length} 幅新拼圖`);
}

// 整個 src/pictures.js 重寫一遍（內容只有資料）
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
const books = Object.entries(BOOKS)
  .map(([k, b]) => `  ${k}: { artist: ${q(b.artist)}, title: ${q(b.title)}, year: ${b.year} },`)
  .join('\n');
const pictures = Object.entries(PICTURES)
  .map(([size, list]) =>
    `  ${size}: [\n` +
    list.map((p) => `    { id: ${q(p.id)}, title: ${q(p.title)}, book: ${q(p.book)}, levels: [${p.levels.join(', ')}] },`).join('\n') +
    `\n  ],`,
  )
  .join('\n');
const file = resolve(import.meta.dirname, '../src/pictures.js');
const header = readFileSync(file, 'utf8').split('export const GRID')[0];
writeFileSync(
  file,
  `${header}export const GRID = { ${Object.entries(GRID).map(([k, v]) => `${k}: ${v}`).join(', ')} };\n\n` +
    `export const BOOKS = {\n${books}\n};\n\nexport const PICTURES = {\n${pictures}\n};\n`,
);

// 記下目前每一幅分到的題目；之後只能往後加，不能改動已經分好的
const lock = Object.fromEntries(Object.entries(PICTURES).map(([size, list]) => [size, list.map((p) => [p.id, ...p.levels])]));
writeFileSync(resolve(import.meta.dirname, '../test/pictures-lock.json'), JSON.stringify(lock) + '\n');
