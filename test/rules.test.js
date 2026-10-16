import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle, findConflicts, isSolved, EMPTY, MARK, QUEEN } from '../src/rules.js';

// 4x4 的唯一解範例：刺蝟在 (0,2) (1,0) (2,3) (3,1)
const ROWS = ['ABBB', 'AABB', 'CCDD', 'CCDD'];

function boardWith(size, queens, marks = []) {
  const b = new Array(size * size).fill(EMPTY);
  for (const [r, c] of queens) b[r * size + c] = QUEEN;
  for (const [r, c] of marks) b[r * size + c] = MARK;
  return b;
}

test('parsePuzzle 依字元出現順序編號色塊', () => {
  const p = parsePuzzle(ROWS);
  assert.equal(p.size, 4);
  assert.deepEqual(p.regions.slice(0, 4), [0, 1, 1, 1]);
});

test('parsePuzzle 拒絕非正方形與色塊數量不符', () => {
  assert.throws(() => parsePuzzle(['AB', 'A']));
  assert.throws(() => parsePuzzle(['AA', 'AA']));
});

test('同列、同行、同色塊、相鄰的刺蝟都算衝突', () => {
  const p = parsePuzzle(['ABCD', 'ABCD', 'ABCD', 'ABCD']);
  assert.deepEqual([...findConflicts(p, boardWith(4, [[0, 0], [0, 3]]))].sort(), [0, 3]); // 同列
  assert.equal(findConflicts(p, boardWith(4, [[0, 0], [3, 0]])).size, 2); // 同行（也同色塊）
  assert.equal(findConflicts(p, boardWith(4, [[0, 0], [1, 1]])).size, 2); // 斜角相鄰
  assert.equal(findConflicts(p, boardWith(4, [[0, 0], [2, 1]])).size, 0); // 不相鄰、不同色塊
});

test('只標出互相衝突的刺蝟', () => {
  const p = parsePuzzle(['ABCD', 'ABCD', 'ABCD', 'ABCD']);
  const conflicts = findConflicts(p, boardWith(4, [[0, 0], [0, 1], [3, 3]]));
  assert.deepEqual([...conflicts].sort(), [0, 1]);
});

test('isSolved：放滿且無衝突才算過關，✕ 不影響', () => {
  const p = parsePuzzle(ROWS);
  const solution = [[0, 2], [1, 0], [2, 3], [3, 1]];
  assert.equal(isSolved(p, boardWith(4, solution)), true);
  assert.equal(isSolved(p, boardWith(4, solution, [[0, 0], [3, 3]])), true);
  assert.equal(isSolved(p, boardWith(4, solution.slice(0, 3))), false);
  assert.equal(isSolved(p, boardWith(4, [[0, 2], [1, 0], [2, 3], [3, 2]])), false);
});
