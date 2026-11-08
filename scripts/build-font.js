// 產生自帶字型：node scripts/build-font.js [jf-openhuninn-2.1.ttf 的路徑]
// 從 jf open 粉圓只留下畫面上用得到的字（scripts/font-chars.js），輸出 fonts/hedgehog-round.woff2，
// 並把收進去的字寫進 fonts/hedgehog-round.txt，test/font.test.js 拿它檢查有沒有漏字。
// 沒給路徑就到 justfont 的 GitHub 下載原檔（約 5 MB，暫存在系統暫存資料夾）。
// 需要 Python 和 fontTools（pip install fonttools brotli）。
//
// 粉圓以 SIL OFL 1.1 授權，保留了「huninn」「open huninn」這兩個字型名稱；子集算修改版，
// 不能再用這兩個名字，所以字型內的名稱改成 Hedgehog Round，版權與授權說明（name ID 0、13、14）原樣保留。
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { collectChars } from './font-chars.js';

const root = resolve(import.meta.dirname, '..');
const SOURCE_URL = 'https://github.com/justfont/open-huninn-font/releases/download/v2.1/jf-openhuninn-2.1.ttf';
const FAMILY = 'Hedgehog Round';
const OUT = join(root, 'fonts', 'hedgehog-round.woff2');
const CHARS = join(root, 'fonts', 'hedgehog-round.txt');

async function sourceFont() {
  if (process.argv[2]) return resolve(process.argv[2]);
  const path = join(tmpdir(), 'jf-openhuninn-2.1.ttf');
  if (!existsSync(path)) {
    console.log(`下載 ${SOURCE_URL}`);
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`下載失敗：${response.status}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return path;
}

// 子集與改名交給 fontTools。粉圓預設的數字本來就等寬，tabular-nums 不需要 tnum
const PYTHON = `
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

src, out, text_file, family = sys.argv[1:5]
opts = subset.Options()
opts.flavor = 'woff2'
opts.name_IDs = ['*']
opts.name_languages = ['*']
opts.notdef_outline = True
font = TTFont(src)
sub = subset.Subsetter(opts)
sub.populate(text=open(text_file, encoding='utf-8').read())
sub.subset(font)

name = font['name']
ps = family.replace(' ', '') + '-Regular'
for rec in list(name.names):
    if rec.nameID in (1, 16):
        rec.string = family
    elif rec.nameID in (2, 17):
        rec.string = 'Regular'
    elif rec.nameID == 3:
        rec.string = ps + ';derived from jf open huninn 2.1'
    elif rec.nameID == 4:
        rec.string = family + ' Regular'
    elif rec.nameID == 6:
        rec.string = ps
font['name'].names = [r for r in name.names if r.nameID not in (16, 17)]
# save_font 才會套用 WOFF2 的 glyf 轉換，直接 font.save 會大一倍
subset.save_font(font, out, opts)
`;

const chars = collectChars(root).join('');
mkdirSync(join(root, 'fonts'), { recursive: true });
writeFileSync(CHARS, chars + '\n');
const python = process.platform === 'win32' ? 'python' : 'python3';
execFileSync(python, ['-c', PYTHON, await sourceFont(), OUT, CHARS, FAMILY], { stdio: 'inherit' });
console.log(`fonts/hedgehog-round.woff2：${[...chars].length} 個字`);
