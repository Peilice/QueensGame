// 擴充題庫：node scripts/add-puzzles.js [每組題數，預設 10] [每組候選題數，預設 3000]
// 每個尺寸用 src/generator.js 出一批候選題，以 scripts/rate-puzzles.js 評分、由易到難排名，
// 再照 target() 的難度曲線挑題，接在 src/puzzles.js 每組最後面。
// 舊關卡的位置不動，關卡編號和舊存檔照常對得上。加完記得跑 npm run verify 和 npm test。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generate } from '../src/generator.js';
import { PUZZLES } from '../src/puzzles.js';
import { rate } from './rate-puzzles.js';

// 第 1–20 關一路由易到難；第 21 關起難度重新起算，不再一直往上疊，題數才能一直加下去
const FRESH = 20;
// 第 21–30 關：中、低交錯，剛從難題下來不會突然變很簡單
const WARMUP = 10;
// 之後中、高交錯，兩條一起往上爬，爬 RAMP 關到頂（第 71 關），之後維持在頂端交錯
const RAMP = 40;

/** 第 index 關（從 0 算）要挑的難度：在候選題裡的排名百分位，0 最簡單、1 最難 */
function target(index) {
  const n = index - FRESH;
  if (n < WARMUP) return n % 2 === 0 ? 0.8 : 0.65;
  const t = Math.min(1, (n - WARMUP) / RAMP);
  return (n - WARMUP) % 2 === 0 ? 0.8 + 0.1 * t : 0.9 + 0.07 * t;
}

const count = Number(process.argv[2] ?? 10);
const pool = Number(process.argv[3] ?? 3000);
const file = resolve(import.meta.dirname, '../src/puzzles.js');
let source = readFileSync(file, 'utf8');
const seen = new Set(Object.values(PUZZLES).flatMap((list) => list.map((rows) => rows.join())));

for (const [key, list] of Object.entries(PUZZLES)) {
  const size = Number(key);
  // 種子從目前題數往後算，每次擴充拿到的是新的一批候選題
  const base = size * 1e6 + list.length * 1e4;
  const candidates = [];
  for (let n = 0; n < pool; n++) {
    const rows = generate(size, base + n);
    const result = rate(rows);
    if (result && !seen.has(rows.join())) candidates.push({ rows, score: result.score });
  }
  candidates.sort((a, b) => a.score - b.score);

  const picked = [];
  for (let k = 0; k < count; k++) {
    // 從目標排名往兩邊找最近一題還沒用過的
    const at = Math.floor(candidates.length * target(list.length + k));
    for (let d = 0; ; d++) {
      const c = [candidates[at + d], candidates[at - d]].find((c) => c && !seen.has(c.rows.join()));
      if (c) {
        seen.add(c.rows.join());
        picked.push(c);
        break;
      }
    }
  }
  console.log(`${size}×${size}：${picked.map((p) => p.score).join(' ')}`);

  const lines = picked.map((p) => `    [${p.rows.map((r) => `'${r}'`).join(', ')}],\n`).join('');
  const comment = `    // 第 ${list.length + 1}–${list.length + count} 關\n`;
  // 插在這一組結尾的「  ],」前面
  const start = source.indexOf(`  ${size}: [`);
  const end = source.indexOf('\n  ],', start) + 1;
  source = source.slice(0, end) + comment + lines + source.slice(end);
}

writeFileSync(file, source);
