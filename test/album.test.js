import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES } from '../src/pictures.js';
import { piecesOf, locate, progress, isComplete, isOpen, canPlay, currentPicture, nextPiece, albumComplete } from '../src/album.js';

const none = new Set();
const first = PICTURES[6][0].levels;
const second = PICTURES[6][1].levels;

test('片數照盤面大小：6×6 是 3×3、7×7 是 4×4、8×8 和 9×9 是 5×5', () => {
  assert.deepEqual([6, 7, 8, 9].map(piecesOf), [9, 16, 25, 25]);
});

test('每一題都找得到在哪一幅的第幾片', () => {
  assert.deepEqual(locate(6, first[4]), { picture: 0, slot: 4 });
  assert.deepEqual(locate(6, second[0]), { picture: 1, slot: 0 });
});

test('一開始只有第一幅打開', () => {
  assert.equal(isOpen(6, 0, none, none), true);
  assert.equal(isOpen(6, 1, none, none), false);
  assert.equal(canPlay(6, first[0], none, none), true);
  assert.equal(canPlay(6, second[0], none, none), false);
});

test('拼完一幅才打開下一幅', () => {
  const almost = new Set(first.slice(1));
  assert.equal(progress(6, 0, almost), 8);
  assert.equal(isOpen(6, 1, almost, none), false);
  const done = new Set(first);
  assert.equal(isComplete(6, 0, done), true);
  assert.equal(isOpen(6, 1, done, none), true);
  assert.equal(isOpen(6, 2, done, none), false);
});

test('舊存檔破過的題、玩到一半的盤面落在後面幾幅：那幾幅也打開', () => {
  assert.equal(isOpen(6, 1, new Set([second[3]]), none), true);
  assert.equal(isOpen(6, 1, none, new Set([second[3]])), true);
});

test('列表預設翻到最前面一幅沒拼完的', () => {
  assert.equal(currentPicture(6, none, none), 0);
  assert.equal(currentPicture(6, new Set(first), none), 1);
  const all = new Set(PICTURES[6].flatMap((p) => p.levels));
  assert.equal(albumComplete(6, all), true);
  assert.equal(currentPicture(6, all, none), PICTURES[6].length - 1);
});

test('下一片：挑這一幅還沒拼的，玩到一半的優先；拼完了是 null', () => {
  const solved = new Set(first.slice(0, 7));
  for (let k = 0; k < 20; k++) assert.ok(first.slice(7).includes(nextPiece(6, 0, solved, none)));
  assert.equal(nextPiece(6, 0, solved, new Set([first[8]])), first[8]);
  assert.equal(nextPiece(6, 0, new Set(first), none), null);
});
