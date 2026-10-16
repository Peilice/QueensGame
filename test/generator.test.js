import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzle } from '../src/rules.js';
import { countSolutions } from '../src/solver.js';
import { generate } from '../src/generator.js';
import { isContiguous } from '../scripts/verify-puzzles.js';

test('6 到 9 每種尺寸隨機出的題都是唯一解、色塊連通', () => {
  for (const size of [6, 7, 8, 9]) {
    for (let seed = 1; seed <= 30; seed++) {
      const rows = generate(size, seed * 2654435761);
      assert.equal(rows.length, size);
      const puzzle = parsePuzzle(rows);
      assert.ok(isContiguous(puzzle), `${size}×${size} 種子 ${seed}：色塊不連通`);
      assert.equal(countSolutions(puzzle, 2), 1, `${size}×${size} 種子 ${seed}：不是唯一解`);
    }
  }
});

test('同一個尺寸和種子永遠出同一題，不同種子出不同題', () => {
  assert.deepEqual(generate(8, 12345), generate(8, 12345));
  assert.notDeepEqual(generate(8, 12345), generate(8, 12346));
});

test('色塊依出現順序命名，第一格一定是 A', () => {
  for (let seed = 0; seed < 10; seed++) assert.equal(generate(7, seed)[0][0], 'A');
});
