// 畫面上可能出現的所有字：子集字型（scripts/build-font.js）和 test/font.test.js 共用。
// 把 index.html、style.css、src/*.js 去掉註解後整份掃過（字串以外的字多收幾個無妨，漏字才麻煩），
// 再加上整排可列印的 ASCII，數字、英文、標點不用逐一列。
// 註解裡的字不收：註解寫得多，收進來字型會大四倍。去註解只認得
//   /* … */、<!-- … -->、整行的 // …、程式後面空一格的 // …
// 所以字串裡不要出現 /*、*/ 或「空白 // 空白」，否則後面那段字會被當成註解漏掉。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SOURCES = (root) => [
  'index.html',
  'style.css',
  ...readdirSync(join(root, 'src'))
    .filter((name) => name.endsWith('.js'))
    .sort()
    .map((name) => `src/${name}`),
];

const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i));

export const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/\s.*$/gm, '');

/** 排好序、不重複的字（以 code point 計） */
export function collectChars(root) {
  const set = new Set(ASCII);
  for (const path of SOURCES(root)) {
    for (const ch of stripComments(readFileSync(join(root, path), 'utf8'))) {
      const cp = ch.codePointAt(0);
      if (cp > 0x7f) set.add(ch);
    }
  }
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
}
