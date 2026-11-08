import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectChars, stripComments } from '../scripts/font-chars.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('畫面上用到的字都收進了自帶字型（漏了就重跑 npm run font）', () => {
  const inFont = new Set(read('fonts/hedgehog-round.txt').replace(/\n$/, ''));
  const missing = collectChars(root).filter((ch) => !inFont.has(ch));
  assert.deepEqual(missing.join(''), '', `字型裡沒有：${missing.join('')}`);
});

test('字型檔和授權檔都在', () => {
  for (const path of ['fonts/hedgehog-round.woff2', 'fonts/OFL.txt']) {
    assert.ok(existsSync(join(root, path)), `${path} 不存在`);
  }
});

test('@font-face 和 font-family 用的是同一個名字，而且不是 OFL 保留的 huninn', () => {
  const css = read('style.css');
  const family = css.match(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/)[1];
  assert.doesNotMatch(family, /huninn/i);
  assert.match(css, new RegExp(`body \\{[^}]*font-family: "${family}"`));
});

test('去註解只拿掉註解，不吃掉字串', () => {
  assert.equal(stripComments("a = 'x'; // 註解\n/* 區塊 */b = 'https://y';"), "a = 'x';\nb = 'https://y';");
  assert.equal(stripComments('<p>字</p><!-- 註 -->'), '<p>字</p>');
});
