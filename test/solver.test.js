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

test('題庫分 6 到 9 四種尺寸，各 10 題，每題唯一解、色塊連通且不重複', () => {
  assert.deepEqual(Object.keys(PUZZLES), ['6', '7', '8', '9']);
  for (const list of Object.values(PUZZLES)) assert.equal(list.length, 10);
  for (const { level, error } of verifyAll()) {
    assert.equal(error, null, `${level}：${error}`);
  }
});
