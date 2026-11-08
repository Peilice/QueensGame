import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Node 沒有 localStorage；storage.js 讀不到時會默默當成沒有存檔，所以先換成記憶體裡的替身
const mem = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  },
});

const storage = await import('../src/storage.js');
const { resolve, open, levelId, solvedIn } = await import('../src/session.js');
const { PICTURES } = await import('../src/pictures.js');
const { PUZZLES } = await import('../src/puzzles.js');
const { solve } = await import('../src/solver.js');
const { QUEEN } = await import('../src/rules.js');

beforeEach(() => mem.clear());

const pic = (size, p) => PICTURES[size][p].levels;
const solveAll = (size, indices) => indices.forEach((i) => storage.markSolved(levelId(size, i)));
const allOf = (size) => PUZZLES[size].map((_, i) => i);

/** 照解答一隻一隻放刺蝟，每一步都像畫面那樣呼叫 move()；回傳最後一步的結果 */
function play(session) {
  const { game } = session;
  const n = game.puzzle.size;
  let result;
  solve(game.puzzle).forEach((c, r) => {
    game.cycle(r * n + c);
    game.cycle(r * n + c);
    result = session.move();
  });
  return result;
}

test('測試用的 localStorage 替身真的有被讀寫', () => {
  storage.markSolved('6-1');
  assert.ok(mem.size > 0);
  assert.ok(solvedIn(6).has(0));
});

test('網址：技巧、教學、隨機分頁、空白', () => {
  assert.deepEqual(resolve('#tips'), { view: 'tips' });
  assert.deepEqual(resolve('#learn'), { view: 'game', target: { kind: 'lesson' } });
  assert.deepEqual(resolve('#random'), { view: 'list', tab: 'random', invalid: false });
  assert.deepEqual(resolve(''), { view: 'list', tab: 'levels', invalid: false });
});

test('網址：隨機題的種子是 base36，超過 32 位元或沒有這個尺寸就退回列表', () => {
  assert.deepEqual(resolve('#r7-1k2f9x'), { view: 'game', target: { kind: 'random', size: 7, seed: parseInt('1k2f9x', 36) } });
  assert.equal(resolve('#r7-zzzzzzz').invalid, true);
  assert.equal(resolve('#r5-abc').invalid, true);
  assert.equal(resolve('#nonsense').invalid, true);
});

test('網址：還沒打開的那一幅、不存在的題號都退回列表並清掉網址', () => {
  const first = pic(6, 0)[3], second = pic(6, 1)[0];
  assert.deepEqual(resolve(`#${levelId(6, first)}`), { view: 'game', target: { kind: 'level', size: 6, index: first } });
  assert.deepEqual(resolve(`#${levelId(6, second)}`), { view: 'list', tab: 'levels', invalid: true });
  assert.equal(resolve('#6-0').invalid, true);
  assert.equal(resolve(`#6-${PUZZLES[6].length + 1}`).invalid, true);
  solveAll(6, pic(6, 0));
  assert.equal(resolve(`#${levelId(6, second)}`).view, 'game');
});

test('拼圖：標題是第幾片、小字是幅名；玩到一半離開，回來盤面還在', () => {
  const index = pic(6, 0)[4];
  const s = open({ kind: 'level', size: 6, index });
  assert.equal(s.title, '第 5 片');
  assert.equal(s.kicker, PICTURES[6][0].title);
  s.game.cycle(0);
  assert.deepEqual(s.move(), { conflict: false, win: null });
  assert.equal(open({ kind: 'level', size: 6, index }).game.board[0], 1);
});

test('拼圖：一幅中間過關，下一片還在同一幅、面板上是剛拿到的那一片', () => {
  const index = pic(6, 0)[2];
  const { win } = play(open({ kind: 'level', size: 6, index }));
  assert.equal(win.title, '過關！');
  assert.equal(win.next.label, '下一片');
  const next = Number(win.next.hash.split('-')[1]) - 1;
  assert.ok(pic(6, 0).includes(next) && next !== index);
  assert.deepEqual(win.piece, { size: 6, picture: 0, slot: 2 });
  assert.deepEqual(win.landed, { size: 6, index });
  assert.equal(win.note, '第 3 片拼上去了・1 / 9');
  assert.ok(solvedIn(6).has(index));
  assert.equal(storage.getBoard(levelId(6, index)), null, '破關後存著的盤面清掉');
});

test('拼圖：一幅最後一片 → 下一幅', () => {
  const [last, ...rest] = pic(6, 0);
  solveAll(6, rest);
  const { win } = play(open({ kind: 'level', size: 6, index: last }));
  assert.equal(win.title, `「${PICTURES[6][0].title}」拼好了！`);
  assert.equal(win.seal, '拼好');
  assert.equal(win.next.label, '下一幅');
  assert.ok(pic(6, 1).map((i) => levelId(6, i)).includes(win.next.hash));
});

test('拼圖：整本拼完 → 挑戰下一本；最大一本也拼完 → 隨機題', () => {
  const [last6, ...rest6] = allOf(6);
  solveAll(6, rest6);
  let { win } = play(open({ kind: 'level', size: 6, index: last6 }));
  assert.equal(win.title, '6×6 全部拼好了！');
  assert.equal(win.next.label, '挑戰 7×7');
  assert.ok(pic(7, 0).map((i) => levelId(7, i)).includes(win.next.hash));

  const [last9, ...rest9] = allOf(9);
  solveAll(9, rest9);
  ({ win } = play(open({ kind: 'level', size: 9, index: last9 })));
  assert.equal(win.next.label, '隨機 9×9');
  assert.match(win.next.hash, /^r9-[0-9a-z]+$/);
});

test('隨機題：同一個種子接著玩，別的種子從空盤開始；過關記一題、放掉存著的盤面', () => {
  const s = open({ kind: 'random', size: 6, seed: 42 });
  assert.equal(s.title, '隨機 6×6');
  s.game.cycle(3);
  s.move();
  assert.equal(open({ kind: 'random', size: 6, seed: 42 }).game.board[3], 1);
  assert.equal(open({ kind: 'random', size: 6, seed: 43 }).game.board[3], 0);

  const { win } = play(open({ kind: 'random', size: 6, seed: 42 }));
  assert.equal(win.next.label, '再來一題');
  assert.match(win.next.hash, /^r6-/);
  assert.equal(win.landed, undefined);
  assert.equal(storage.getRandomSolved()[6], 1);
  assert.equal(storage.getRandom(6), null);
});

test('隨機題換一題：放掉這一盤，給同尺寸的新網址', () => {
  const s = open({ kind: 'random', size: 8, seed: 7 });
  s.game.cycle(0);
  s.move();
  assert.match(s.shuffle(), /^r8-/);
  assert.equal(storage.getRandom(8), null);
});

test('教學：有引導、不存盤面；做完帶去最小一本的第一片，破過題就是「下一片」', () => {
  const s = open({ kind: 'lesson' });
  assert.equal(s.title, '怎麼玩');
  assert.ok(s.hint.text);
  let { win } = play(s);
  assert.equal(s.hint, null, '過關後不再引導');
  assert.equal(win.title, '學會了！');
  assert.equal(win.next.label, '去拼第一片');
  assert.ok(pic(6, 0).map((i) => levelId(6, i)).includes(win.next.hash));
  assert.equal(mem.size, 0, '教學不存檔');

  solveAll(6, [pic(6, 0)[0]]);
  ({ win } = play(open({ kind: 'lesson' })));
  assert.equal(win.next.label, '去拼下一片');
});

test('衝突：放下去多刺到別人才算，數量沒增加不算', () => {
  const s = open({ kind: 'random', size: 6, seed: 1 });
  const { game } = s;
  game.cycle(0); game.cycle(0);
  assert.equal(s.move().conflict, false);
  game.cycle(1); game.cycle(1);
  assert.equal(game.board[1], QUEEN);
  assert.equal(s.move().conflict, true);
  game.cycle(20);
  assert.equal(s.move().conflict, false);
});
