import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle, EMPTY, MARK, QUEEN } from '../src/rules.js';
import { Game, isUnlocked } from '../src/game.js';

const puzzle = parsePuzzle(['ABBB', 'AABB', 'CCDD', 'CCDD']);

test('點擊循環：空 → ✕ → 刺蝟 → 空', () => {
  const g = new Game(puzzle);
  g.cycle(0);
  assert.equal(g.board[0], MARK);
  g.cycle(0);
  assert.equal(g.board[0], QUEEN);
  g.cycle(0);
  assert.equal(g.board[0], EMPTY);
});

test('拖曳標 ✕ 只標空格，整批一步 Undo', () => {
  const g = new Game(puzzle);
  g.cycle(1);
  g.cycle(1); // (0,1) 為刺蝟
  g.mark([0, 1, 2, 3]);
  assert.deepEqual(g.board.slice(0, 4), [MARK, QUEEN, MARK, MARK]);
  g.undo();
  assert.deepEqual(g.board.slice(0, 4), [EMPTY, QUEEN, EMPTY, EMPTY]);
});

test('沒有實際改變的操作不進歷史', () => {
  const g = new Game(puzzle);
  assert.equal(g.mark([]), false);
  assert.equal(g.reset(), false);
  assert.equal(g.canUndo, false);
});

test('重來可以被 Undo 救回', () => {
  const g = new Game(puzzle);
  g.cycle(5);
  g.reset();
  assert.ok(g.board.every((s) => s === EMPTY));
  g.undo();
  assert.equal(g.board[5], MARK);
});

test('可從存檔盤面還原，且不帶歷史', () => {
  const saved = new Array(16).fill(EMPTY);
  saved[3] = QUEEN;
  const g = new Game(puzzle, saved);
  assert.equal(g.board[3], QUEEN);
  assert.equal(g.canUndo, false);
});

test('放出正解即過關', () => {
  const g = new Game(puzzle);
  for (const i of [2, 4, 11, 13]) { g.cycle(i); g.cycle(i); }
  assert.equal(g.solved, true);
});

test('依序解鎖', () => {
  assert.equal(isUnlocked(0, new Set()), true);
  assert.equal(isUnlocked(1, new Set()), false);
  assert.equal(isUnlocked(1, new Set([0])), true);
  assert.equal(isUnlocked(3, new Set([0, 1])), false);
});
