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

test('拖曳擦 ✕ 只擦 ✕，刺蝟不動，整批一步 Undo', () => {
  const g = new Game(puzzle);
  g.mark([0, 2, 3]);
  g.cycle(1);
  g.cycle(1); // (0,1) 為刺蝟
  assert.equal(g.unmark([0, 1, 2]), true);
  assert.deepEqual(g.board.slice(0, 4), [EMPTY, QUEEN, EMPTY, MARK]);
  g.undo();
  assert.deepEqual(g.board.slice(0, 4), [MARK, QUEEN, MARK, MARK]);
  assert.equal(g.unmark([1, 4]), false);
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

test('標記：之後畫的都算試放，跟按下時不一樣的格子就是', () => {
  const g = new Game(puzzle);
  g.cycle(0);
  assert.equal(g.startTrial(), true);
  assert.equal(g.trying, true);
  assert.deepEqual([...g.tentative], []);
  g.cycle(5);
  g.cycle(5);
  g.mark([0, 1, 2]);
  assert.deepEqual([...g.tentative].sort((a, b) => a - b), [1, 2, 5]);
  assert.equal(g.startTrial(), false, '只有一層，標記中不能再按');
});

test('擦掉：回到按下標記那一刻；留下：試放的都算數', () => {
  const g = new Game(puzzle);
  g.cycle(0);
  g.startTrial();
  g.cycle(0);
  g.cycle(7);
  assert.equal(g.erase(), true);
  assert.equal(g.trying, false);
  assert.deepEqual(g.board, [MARK, ...new Array(15).fill(EMPTY)]);

  g.startTrial();
  g.cycle(7);
  assert.equal(g.keep(), true);
  assert.equal(g.trying, false);
  assert.equal(g.board[7], MARK);
  assert.deepEqual([...g.tentative], []);
  assert.equal(g.keep(), false, '不在標記中，留下和擦掉都沒作用');
  assert.equal(g.erase(), false);
});

test('上一步連標記狀態一起退回', () => {
  const g = new Game(puzzle);
  g.startTrial();
  g.cycle(3);
  g.erase();
  g.undo();
  assert.equal(g.trying, true, '擦掉可以救回來');
  assert.equal(g.board[3], MARK);
  assert.deepEqual([...g.tentative], [3]);
  g.undo();
  g.undo();
  assert.equal(g.trying, false, '退到按標記之前就離開標記');
  assert.equal(g.canUndo, false);
});

test('重來會離開標記，空盤也算一步', () => {
  const g = new Game(puzzle);
  g.startTrial();
  assert.equal(g.reset(), true);
  assert.equal(g.trying, false);
  g.undo();
  assert.equal(g.trying, true);
});

test('標記中解開直接算數', () => {
  const g = new Game(puzzle);
  g.startTrial();
  for (const i of [2, 4, 11, 13]) { g.cycle(i); g.cycle(i); }
  assert.equal(g.solved, true);
  assert.equal(g.trying, false);
});

test('可從存檔還原標記中的盤面', () => {
  const trial = new Array(16).fill(EMPTY);
  const board = [...trial];
  board[6] = QUEEN;
  const g = new Game(puzzle, board, trial);
  assert.equal(g.trying, true);
  assert.deepEqual([...g.tentative], [6]);
  assert.equal(new Game(puzzle, board, [EMPTY]).trying, false, '長度對不上的快照不採用');
});
