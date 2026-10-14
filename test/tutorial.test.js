import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle, MARK, QUEEN } from '../src/rules.js';
import { Game } from '../src/game.js';
import { LESSON, STEPS, currentStep, targets } from '../src/tutorial.js';

const puzzle = parsePuzzle(LESSON);
const at = (r, c) => r * 5 + c;

/** 照著引導做：每做一個動作就重新判定目前在哪一步 */
function walk() {
  const game = new Game(puzzle);
  let step = 0;
  const seen = [step];
  const act = (fn) => {
    fn(game);
    step = currentStep(puzzle, game.board, step);
    if (seen.at(-1) !== step) seen.push(step);
  };
  return { game, seen, act, get step() { return step; } };
}

test('跟著每一步做，會依序走完並過關', () => {
  const w = walk();
  const place = (i) => (g) => { g.cycle(i); g.cycle(i); };

  w.act((g) => g.cycle(at(2, 2)));
  assert.equal(w.step, 0, '只標了 ✕，還沒放刺蝟');
  w.act((g) => g.cycle(at(2, 2)));
  assert.equal(w.step, 1);

  w.act((g) => g.mark([at(2, 0), at(2, 1), at(2, 3), at(2, 4)]));
  assert.equal(w.step, 1, '只標了列，行還沒標');
  w.act((g) => g.mark([at(0, 2), at(1, 2), at(3, 2), at(4, 2)]));
  assert.equal(w.step, 2);

  w.act(place(at(1, 3)));
  assert.equal(w.step, 3, '出現衝突後要按上一步');
  w.act((g) => g.undo());
  assert.equal(w.step, 4);
  assert.equal(w.game.board[at(1, 3)], MARK, '上一步只收回刺蝟，✕ 留著');

  w.act((g) => g.mark(targets(STEPS[4], g.board)));
  assert.equal(w.step, 5);
  w.act((g) => g.mark([at(3, 4), at(4, 4)]));
  assert.equal(w.step, 6);

  for (const i of [at(3, 0), at(4, 3), at(1, 4), at(0, 1)]) w.act(place(i));
  assert.equal(w.game.solved, true);
  assert.deepEqual(w.seen, [0, 1, 2, 3, 4, 5, 6]);
});

test('已經做到的步驟會直接跳過', () => {
  const board = new Array(25).fill(0);
  board[at(2, 2)] = QUEEN;
  for (const i of STEPS[1].cells) board[i] = MARK;
  assert.equal(currentStep(puzzle, board, 0), 2);
});

test('步驟只前進不後退', () => {
  const empty = new Array(25).fill(0);
  assert.equal(currentStep(puzzle, empty, 4), 4);
});

test('有 want 的步驟只亮還沒做到的格子', () => {
  const board = new Array(25).fill(0);
  board[at(2, 0)] = MARK;
  const lit = targets(STEPS[1], board);
  assert.equal(lit.length, STEPS[1].cells.length - 1);
  assert.ok(!lit.includes(at(2, 0)));
});
