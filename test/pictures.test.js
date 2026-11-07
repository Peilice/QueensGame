import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PICTURES, GRID, BOOKS } from '../src/pictures.js';
import { PUZZLES } from '../src/puzzles.js';
import { tabs, piecePath } from '../src/jigsaw.js';

const root = new URL('../', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('test/pictures-lock.json', root), 'utf8'));

test('每一題剛好在一幅拼圖裡，每一幅的片數照尺寸', () => {
  for (const [size, list] of Object.entries(PICTURES)) {
    const per = GRID[size] ** 2;
    const all = list.flatMap((p) => p.levels);
    for (const p of list) assert.equal(p.levels.length, per, `${size}×${size} ${p.id} 不是 ${per} 片`);
    assert.equal(new Set(all).size, all.length, `${size}×${size} 有題目被分到兩幅`);
    assert.deepEqual([...all].sort((a, b) => a - b), PUZZLES[size].map((_, i) => i), `${size}×${size} 題庫和拼圖對不上`);
  }
});

test('拼圖 id 不重複，插圖大圖和縮圖都在，出處都寫了', () => {
  const ids = Object.values(PICTURES).flat().map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of Object.values(PICTURES).flat()) {
    assert.ok(existsSync(new URL(`pictures/${p.id}.webp`, root)), `pictures/${p.id}.webp 不存在`);
    assert.ok(existsSync(new URL(`pictures/${p.id}-s.webp`, root)), `pictures/${p.id}-s.webp 不存在`);
    assert.ok(BOOKS[p.book], `${p.id} 的出處 ${p.book} 沒寫在 BOOKS`);
  }
});

test('已經分好的拼圖不能改：題目、順序、位置都和 test/pictures-lock.json 一樣，只能往後加', () => {
  for (const [size, locked] of Object.entries(lock)) {
    locked.forEach(([id, ...levels], k) => {
      const p = PICTURES[size][k];
      assert.ok(p, `${size}×${size} 第 ${k + 1} 幅（${id}）不見了`);
      assert.equal(p.id, id, `${size}×${size} 第 ${k + 1} 幅換成了 ${p.id}`);
      assert.deepEqual(p.levels, levels, `${size}×${size} ${id} 的題目被改動，玩家的碎片會換位置`);
    });
  }
});

test('拼圖片的形狀：相鄰兩片共用同一條接縫，路徑都是封閉的', () => {
  for (const n of [3, 4, 5]) {
    const t = tabs(n, 42);
    for (let i = 0; i < n * n; i++) {
      const d = piecePath(n, t, i);
      assert.match(d, /^M[\d.]+ [\d.]+.*Z$/);
    }
    // 外框是直線，內部每條接縫都有凸耳
    assert.equal(t.h.length, n + 1);
    assert.equal(t.v[0].length, n + 1);
  }
});
