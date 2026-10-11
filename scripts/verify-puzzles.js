// 驗證題庫：每題格式正確、色塊連通、且恰有唯一解。
import { parsePuzzle } from '../src/rules.js';
import { countSolutions } from '../src/solver.js';
import { PUZZLES } from '../src/puzzles.js';
import { pathToFileURL } from 'node:url';

export function isContiguous(puzzle) {
  const { size, regions } = puzzle;
  for (let id = 0; id < size; id++) {
    const cells = regions.flatMap((r, i) => (r === id ? [i] : []));
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const i = stack.pop();
      const r = Math.floor(i / size), c = i % size;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const j = nr * size + nc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
        if (regions[j] === id && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

export function verifyAll() {
  return PUZZLES.map((rows, level) => {
    try {
      const puzzle = parsePuzzle(rows);
      if (!isContiguous(puzzle)) return { level, error: '色塊不連通' };
      const n = countSolutions(puzzle, 2);
      if (n !== 1) return { level, error: n === 0 ? '無解' : '多於一個解' };
      return { level, error: null };
    } catch (e) {
      return { level, error: e.message };
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = verifyAll();
  for (const { level, error } of results) {
    console.log(`第 ${level + 1} 關：${error ?? 'OK'}`);
  }
  process.exit(results.some((r) => r.error) ? 1 : 0);
}
