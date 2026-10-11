import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle } from '../src/rules.js';
import { countSolutions, solve } from '../src/solver.js';
import { verifyAll } from '../scripts/verify-puzzles.js';
import { PUZZLES } from '../src/puzzles.js';

test('唯一解的題目', () => {
  const p = parsePuzzle(['ABBB', 'AABB', 'CCDD', 'CCDD']);
  assert.equal(countSolutions(p), 1);
  assert.deepEqual(solve(p), [2, 0, 3, 1]);
});

test('多解的題目', () => {
  // 每欄一個色塊：等同 4 皇后＋相鄰限制，有 2 個解
  const p = parsePuzzle(['ABCD', 'ABCD', 'ABCD', 'ABCD']);
  assert.equal(countSolutions(p, 10), 2);
});

test('無解的題目', () => {
  const p = parsePuzzle(['ABC', 'ABC', 'ABC']);
  assert.equal(countSolutions(p), 0);
  assert.equal(solve(p), null);
});

test('題庫共 12 題，尺寸 6 到 9 遞增，每題唯一解且色塊連通', () => {
  assert.equal(PUZZLES.length, 12);
  const sizes = PUZZLES.map((rows) => rows.length);
  assert.deepEqual(sizes, [...sizes].sort((a, b) => a - b));
  assert.equal(sizes[0], 6);
  assert.equal(sizes.at(-1), 9);
  for (const { level, error } of verifyAll()) {
    assert.equal(error, null, `第 ${level + 1} 關：${error}`);
  }
});
