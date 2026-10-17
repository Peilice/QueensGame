import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle, findConflicts, QUEEN, EMPTY } from '../src/rules.js';
import { TIPS, cellsOf } from '../src/tips.js';

/** 列出所有解：每一列刺蝟所在的格子索引 */
function solutions({ size, regions }) {
  const found = [];
  const cols = [];
  const usedRegions = new Set();
  (function place(row) {
    if (row === size) return found.push(cols.map((c, r) => r * size + c));
    for (let col = 0; col < size; col++) {
      const region = regions[row * size + col];
      if (cols.includes(col) || usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      cols.push(col);
      usedRegions.add(region);
      place(row + 1);
      cols.pop();
      usedRegions.delete(region);
    }
  })(0);
  return found;
}

/** 在 a 放刺蝟會不會刺到 b */
function attacks(puzzle, a, b) {
  const board = new Array(puzzle.size ** 2).fill(EMPTY);
  board[a] = board[b] = QUEEN;
  return findConflicts(puzzle, board).size > 0;
}

/** 色塊相連：從第一格出發，上下左右走得到同色塊的每一格 */
function connected({ size, regions }, id) {
  const cells = regions.flatMap((r, i) => (r === id ? [i] : []));
  const seen = new Set([cells[0]]);
  const queue = [cells[0]];
  while (queue.length) {
    const i = queue.shift();
    const r = Math.floor(i / size), c = i % size;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      const j = nr * size + nc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[j] === id && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

const figures = TIPS.flatMap((tip) => tip.figures.map((figure, n) => ({ tip, figure, n })));

for (const { tip, figure, n } of figures) {
  const name = `${tip.title}（第 ${n + 1} 張圖）`;
  const puzzle = parsePuzzle(figure.regions);
  const { size } = puzzle;

  test(`${name}：格式正確、色塊相連`, () => {
    for (const grid of [figure.ink, figure.look]) {
      assert.equal(grid.length, size);
      for (const row of grid) assert.equal(row.length, size);
    }
    assert.match(figure.ink.join(''), /^[.Qx*+?~]+$/);
    assert.match(figure.look.join(''), /^[.o!]+$/);
    for (let id = 0; id < size; id++) assert.ok(connected(puzzle, id), `色塊 ${id} 不相連`);
  });

  if (cellsOf(figure.ink, '?').length === 0) {
    test(`${name}：推出來的結論在每一個符合盤面的解裡都成立`, () => {
      const queens = cellsOf(figure.ink, 'Q');
      const marks = cellsOf(figure.ink, 'x');
      const fits = solutions(puzzle).filter(
        (s) => queens.every((i) => s.includes(i)) && marks.every((i) => !s.includes(i)),
      );
      assert.ok(fits.length > 0, '盤面已經沒有解');
      for (const s of fits) {
        for (const i of cellsOf(figure.ink, '*')) assert.ok(s.includes(i), `格子 ${i} 應該是刺蝟`);
        for (const i of cellsOf(figure.ink, '+')) assert.ok(!s.includes(i), `格子 ${i} 應該標 ✕`);
      }
    });
  } else {
    test(`${name}：假裝放下的刺蝟讓整個色塊、整列或整行沒地方放`, () => {
      const [maybe] = cellsOf(figure.ink, '?');
      for (const i of cellsOf(figure.ink, '~')) assert.ok(attacks(puzzle, maybe, i), `格子 ${i} 沒被刺到`);
      const dead = cellsOf(figure.look, '!');
      const blocked = new Set(cellsOf(figure.ink, 'x~'));
      for (const i of dead) assert.ok(blocked.has(i), `格子 ${i} 其實還能放`);
      const groups = [];
      for (let k = 0; k < size; k++) {
        groups.push(puzzle.regions.flatMap((r, i) => (r === k ? [i] : [])));
        groups.push([...Array(size).keys()].map((c) => k * size + c));
        groups.push([...Array(size).keys()].map((r) => r * size + k));
      }
      assert.ok(
        groups.some((g) => g.length === dead.length && g.every((i) => dead.includes(i))),
        '沒地方放的格子要剛好是一整個色塊、一整列或一整行',
      );
      // 下一張圖把這格標成推出來的 ✕
      const next = tip.figures[n + 1];
      assert.ok(next && cellsOf(next.ink, '+').includes(maybe), '下一張圖要把這格標 ✕');
    });
  }
}
