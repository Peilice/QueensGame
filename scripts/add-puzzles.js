// 擴充題庫：node scripts/add-puzzles.js 6=9 7=16 [--pool 3000]
// 每個「尺寸=題數」用 src/generator.js 出一批候選題、以 scripts/rate-puzzles.js 評分，
// 再從最簡單到最難平均挑出指定題數（拼圖不照難度排，難易混著出），接在 src/puzzles.js 那一組最後面。
// 舊題目的位置不動，題目編號和舊存檔照常對得上。
// 題數通常是一幅拼圖的片數（6×6 是 9、7×7 是 16、8×8 和 9×9 是 25）；加完跑 scripts/build-pictures.js 把新題分進新的拼圖，
// 再跑 npm run verify 和 npm test。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generate } from '../src/generator.js';
import { PUZZLES } from '../src/puzzles.js';
import { rate } from './rate-puzzles.js';

const args = process.argv.slice(2);
const poolAt = args.indexOf('--pool');
const pool = poolAt >= 0 ? Number(args.splice(poolAt, 2)[1]) : 3000;
const wanted = args.map((a) => a.split('=').map(Number)).filter(([size, n]) => PUZZLES[size] && n > 0);
if (!wanted.length) {
  console.error('用法：node scripts/add-puzzles.js 6=9 7=16 [--pool 3000]');
  process.exit(1);
}

const file = resolve(import.meta.dirname, '../src/puzzles.js');
let source = readFileSync(file, 'utf8');
const seen = new Set(Object.values(PUZZLES).flatMap((list) => list.map((rows) => rows.join())));

for (const [size, count] of wanted) {
  const list = PUZZLES[size];
  // 種子從目前題數往後算，每次擴充拿到的是新的一批候選題
  const base = size * 1e6 + list.length * 1e4;
  const candidates = [];
  for (let n = 0; n < Math.max(pool, count * 3); n++) {
    const rows = generate(size, base + n);
    const key = rows.join();
    if (seen.has(key)) continue;
    const result = rate(rows);
    if (result) {
      seen.add(key);
      candidates.push({ rows, score: result.score });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  if (candidates.length < count) throw new Error(`${size}×${size} 候選題不夠：要 ${count} 題，只有 ${candidates.length} 題`);

  // 從最簡單到最難平均取樣：第 k 題取排名在 (k + 0.5) / count 的那一題
  const picked = [];
  for (let k = 0; k < count; k++) picked.push(candidates[Math.floor(((k + 0.5) / count) * candidates.length)]);
  const scores = picked.map((p) => p.score);
  console.log(`${size}×${size}：加 ${count} 題，分數 ${Math.min(...scores)}–${Math.max(...scores)}`);

  const lines = picked.map((p) => `    [${p.rows.map((r) => `'${r}'`).join(', ')}],\n`).join('');
  const comment = `    // 第 ${list.length + 1}–${list.length + count} 題\n`;
  // 插在這一組結尾的「  ],」前面
  const start = source.indexOf(`  ${size}: [`);
  const end = source.indexOf('\n  ],', start) + 1;
  source = source.slice(0, end) + comment + lines + source.slice(end);
}

writeFileSync(file, source);
