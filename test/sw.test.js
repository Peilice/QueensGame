import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

/** sw.js 的 PRECACHE 清單 */
const precache = JSON.parse(
  read('sw.js')
    .match(/const PRECACHE = (\[[^\]]*\])/)[1]
    .replace(/'/g, '"')
    .replace(/,\s*\]/, ']'),
);

test('PRECACHE 列的檔案都存在（少一個 service worker 就裝不起來）', () => {
  for (const path of precache.filter((p) => p !== './')) {
    assert.ok(existsSync(new URL(path, root)), `${path} 不存在`);
  }
});

test('src/ 底下每個模組都在 PRECACHE 裡', () => {
  for (const name of readdirSync(new URL('src/', root))) {
    assert.ok(precache.includes(`src/${name}`), `src/${name} 沒列進 PRECACHE，離線時會載入失敗`);
  }
});

test('index.html、style.css、manifest 引用的本地檔案都在 PRECACHE 裡', () => {
  const refs = [
    ...read('index.html').matchAll(/(?:href|src)="([^"]+)"/g),
    ...read('style.css').matchAll(/url\("([^"]+)"\)/g),
    ...read('manifest.webmanifest').matchAll(/"src": "([^"]+)"/g),
  ]
    .map((m) => m[1].split('?')[0])
    .filter((path) => !/^(https?:|data:|#)/.test(path));
  for (const path of refs) assert.ok(precache.includes(path), `${path} 沒列進 PRECACHE`);
});
