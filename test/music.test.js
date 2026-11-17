import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TRACKS, pick } from '../src/music.js';

const root = new URL('../', import.meta.url);

test('每首背景音樂的音檔都在', () => {
  for (const path of TRACKS) assert.ok(existsSync(new URL(path, root)), `${path} 不存在`);
});

test('一輪裡每首都播過一次才重來，換輪時也不會連著兩次同一首', () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let played = [];
  let last = null;
  const order = [];
  for (let i = 0; i < TRACKS.length * 40; i++) {
    ({ next: last, played } = pick(played, last, random));
    order.push(last);
  }
  for (let i = 0; i < order.length; i += TRACKS.length) {
    assert.deepEqual([...order.slice(i, i + TRACKS.length)].sort(), [...TRACKS].sort(), `第 ${i / TRACKS.length + 1} 輪`);
  }
  for (let i = 1; i < order.length; i++) assert.notEqual(order[i], order[i - 1], `第 ${i} 首和前一首一樣`);
});
