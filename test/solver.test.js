import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle } from '../src/rules.js';
import { countSolutions, solve, otherSolution } from '../src/solver.js';
import { verifyAll } from '../scripts/verify-puzzles.js';
import { PUZZLES } from '../src/puzzles.js';

test('唯一解的題目', () => {
  const p = parsePuzzle(['ABBB', 'AABB', 'CCDD', 'CCDD']);
  assert.equal(countSolutions(p), 1);
  assert.deepEqual(solve(p), [2, 0, 3, 1]);
});

test('多解的題目', () => {
  // 每欄一個色塊：等同 4 皇后問題＋相鄰限制，有 2 個解
  const p = parsePuzzle(['ABCD', 'ABCD', 'ABCD', 'ABCD']);
  assert.equal(countSolutions(p, 10), 2);
});

test('找另一個解：多解時回傳和答案不同的那個，唯一解時是 null', () => {
  const many = parsePuzzle(['ABCD', 'ABCD', 'ABCD', 'ABCD']);
  assert.deepEqual(otherSolution(many, [1, 3, 0, 2]), [2, 0, 3, 1]);
  assert.deepEqual(otherSolution(many, [2, 0, 3, 1]), [1, 3, 0, 2]);
  const one = parsePuzzle(['ABBB', 'AABB', 'CCDD', 'CCDD']);
  assert.equal(otherSolution(one, [2, 0, 3, 1]), null);
});

test('無解的題目', () => {
  const p = parsePuzzle(['ABC', 'ABC', 'ABC']);
  assert.equal(countSolutions(p), 0);
  assert.equal(solve(p), null);
});

test('題庫分 6 到 9 四種尺寸，每組至少 50 題（改版前的題目都還在），每題唯一解、色塊連通且不重複', () => {
  assert.deepEqual(Object.keys(PUZZLES), ['6', '7', '8', '9']);
  // 各組題數照拼圖片數往上加，不一定一樣多（每一題剛好在一幅拼圖裡，由 test/pictures.test.js 檢查）
  for (const list of Object.values(PUZZLES)) assert.ok(list.length >= 50);
  for (const { level, error } of verifyAll()) {
    assert.equal(error, null, `${level}：${error}`);
  }
});
