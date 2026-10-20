import { parsePuzzle, findConflicts, EMPTY, MARK, QUEEN } from './rules.js';
import { Game, isUnlocked } from './game.js';
import { PUZZLES } from './puzzles.js';
import { generate, newSeed } from './generator.js';
import * as storage from './storage.js';
import * as sound from './sound.js';
import { LESSON, STEPS, currentStep, targets } from './tutorial.js';
import { TIPS, cellsOf } from './tips.js';

const $ = (id) => document.getElementById(id);

// 關卡格右上角的狀態小圖示：同一套線條粗細
const CHECK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const LOCK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// 已完成組的章名右側：和規則頁邊籤同一個箭頭，翻開時轉向下
const CHEVRON_SVG = '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/** 已破關卡在目錄上的淡印：那一題的色塊縮圖加上色塊邊界，像印在目錄頁上的小圖 */
const printSvg = (puzzle) => `<span class="print" aria-hidden="true">${regionSvg(puzzle)}</span>`;

function regionSvg({ size, regions }) {
  const at = (r, c) => regions[r * size + c];
  let fills = '';
  // 同一列連續同色的格子合成一塊，相鄰兩塊略為重疊，避免縮放後露出接縫
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; ) {
      let end = c;
      while (end + 1 < size && at(r, end + 1) === at(r, c)) end++;
      fills += `<rect x="${c}" y="${r}" width="${end - c + 1.04}" height="1.04" style="fill:var(--r${at(r, c)})"/>`;
      c = end + 1;
    }
  }
  let edges = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size && at(r, c) !== at(r, c + 1)) edges += `M${c + 1} ${r}v1`;
      if (r + 1 < size && at(r, c) !== at(r + 1, c)) edges += `M${c} ${r + 1}h1`;
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="none">${fills}<path d="${edges}"/></svg>`;
}

// ---------- 墨跡：每一筆都是手畫的，所以每一次都不完全一樣 ----------

const wobble = (amount) => (Math.random() * 2 - 1) * amount;
const fmt = (v) => v.toFixed(2);

/** 一筆略帶弧度、端點不完全對齊的筆畫；pathLength=1 讓描線動畫不必量長度 */
function penStroke(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2 + wobble(1.6), my = (y1 + y2) / 2 + wobble(1.6);
  return `<path pathLength="1" d="M${fmt(x1 + wobble(0.9))} ${fmt(y1 + wobble(0.9))}Q${fmt(mx)} ${fmt(my)} ${fmt(x2 + wobble(0.9))} ${fmt(y2 + wobble(0.9))}"/>`;
}

/** ✕：先左上往右下，再右上往左下，跟手寫的筆順一樣 */
const markSvg = () =>
  `<svg class="x" viewBox="0 0 24 24" aria-hidden="true">${penStroke(7, 7, 17, 17)}${penStroke(17, 7, 7, 17)}</svg>`;

/** 刺蝟（側面、頭朝右）：圓滾滾的棕色刺背、奶油色的臉、亮晶晶的眼睛、腮紅和圓鼻頭。
 *  顏色交給 style.css 的 .hh-* 決定，棋盤上、刊頭上、教學卡上都是同一隻 */
const HEDGEHOG_VIEWBOX = '-1.5 2.5 25.5 20';
const HEDGEHOG =
  '<g class="hh-line">' +
  '<rect class="hh-foot" x="5" y="17.4" width="2.8" height="3.6" rx="1.4"/>' +
  '<rect class="hh-foot" x="13.2" y="17.4" width="2.8" height="3.6" rx="1.4"/>' +
  '<path class="hh-spine" d="M2.2 16.1L-0.3 14.8L2.4 13.9L0.3 12L3.1 11.8L1.6 9.4L4.4 10L3.6 7.3L6 8.5L6 5.7L8 7.6L8.7 4.9L10.2 7.3L11.6 4.9L12.4 7.6L14.4 5.6L14.4 8.4L16.8 7.1L16.1 9.8L18.8 9.2L17.4 11.6L16 19.4L4.6 19.4Q2.1 19.2 2.2 16.1Z"/>' +
  '<path class="hh-face" d="M13.7 9.9Q18.6 9.6 21.4 14Q22.8 16.1 21.8 17.4Q20 19.4 14.3 19.5Q11 15.3 13.7 9.9Z"/>' +
  '</g>' +
  '<ellipse class="hh-blush" cx="17" cy="16.7" rx="1.5" ry=".9"/>' +
  '<circle class="hh-eye" cx="17.9" cy="13.8" r="1.3"/><circle class="hh-glint" cx="18.3" cy="13.35" r=".45"/>' +
  '<circle class="hh-eye" cx="22" cy="15.9" r="1.15"/>';

const hedgehogSvg = (cls = '') =>
  `<svg class="${cls}" viewBox="${HEDGEHOG_VIEWBOX}" aria-hidden="true">${HEDGEHOG}</svg>`;

/** 棋盤上的刺蝟：每一隻站的角度都有點不一樣，看起來像一隻隻自己走進來的 */
const queenSvg = () =>
  `<svg class="q" viewBox="${HEDGEHOG_VIEWBOX}" aria-hidden="true"><g transform="rotate(${fmt(wobble(4))} 11 14)">${HEDGEHOG}</g></svg>`;

// 墨跡離場的時間（和 style.css 的 pen-out／lift 對齊），之後才從 DOM 移除
const LEAVE_MS = { [MARK]: 200, [QUEEN]: 160 };

let level = null; // { size, index }
let lesson = null; // 教學進行中：{ step }，和 level 不會同時有值
let random = null; // 隨機題進行中：{ size, seed }，和 level、lesson 不會同時有值
let game = null;
let cells = [];
let shown = []; // 每格目前畫在紙上的狀態，只有變了才重畫
let winTimers = [];
let conflictCount = 0; // 上一次的衝突格數：多出新的衝突才「咚」一聲

const desktop = matchMedia('(min-width: 760px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const levelId = (size, index) => `${size}-${index + 1}`;
// 隨機題的網址：r 加尺寸再加 base36 的種子，例如 r7-1k2f9x；同一個網址永遠是同一題
const randomId = (size, seed) => `r${size}-${seed.toString(36)}`;

/** 某尺寸已破關的索引集合 */
function solvedIn(size, solved = storage.getSolved()) {
  return new Set(PUZZLES[size].flatMap((_, i) => (solved.has(levelId(size, i)) ? [i] : [])));
}

// ---------- 路由：#6-3 代表 6×6 第 3 關，#r6-xxxx 是隨機題，#learn 是教學，#tips 是解題技巧；
// 列表分兩頁：空白是「關卡」，#random 是「隨機難度」 ----------

// 已經在這個網站裡換過畫面：技巧頁的「返回」才能放心用瀏覽器上一頁
let routed = false;
let tipsFromApp = false;

function route() {
  const wasRouted = routed;
  routed = true;
  if (location.hash === '#tips') return openTips(wasRouted);
  if (location.hash === '#learn') return openLesson();
  if (location.hash === '#random') return showLevels('random');
  const [, rSize, rSeed] = location.hash.match(/^#r(\d+)-([0-9a-z]{1,7})$/) ?? [];
  const seed = parseInt(rSeed, 36);
  if (PUZZLES[rSize] && seed < 2 ** 32) return openRandom(Number(rSize), seed);
  const [, size, n] = location.hash.match(/^#(\d+)-(\d+)$/) ?? [];
  const index = n - 1;
  if (PUZZLES[size] && index >= 0 && index < PUZZLES[size].length && isUnlocked(index, solvedIn(size))) {
    openLevel(Number(size), index);
  } else {
    if (location.hash) history.replaceState(null, '', location.pathname);
    showLevels();
  }
}

function go(target) {
  location.hash = target === null ? '' : levelId(target.size, target.index);
}

/** 回列表：從隨機題回來就回到「隨機難度」那一頁 */
const goList = () => (location.hash = random ? 'random' : '');

// ---------- 關卡列表 ----------

// 關卡格一排幾格，要和 style.css 的 .level-list 欄數一致
const COLUMNS = 5;
// 緞帶只印最後幾題、固定一排，要和 style.css 的 .ribbon 欄數一致
const RIBBON = 10;

// 這次瀏覽中翻開過的已完成組（鍵是尺寸）和進行中組的已破段落（鍵是「尺寸-solved」）：從關卡回到列表時維持翻開
const openPacks = new Set();

/** 三個畫面一次只顯示一個 */
function showView(id) {
  for (const view of ['levels-view', 'game-view', 'tips-view']) $(view).hidden = view !== id;
}

function showLevels(tab = 'levels') {
  const from = level;
  const fromRandom = random;
  level = lesson = random = game = null;
  clearWin();
  showView('levels-view');
  for (const name of ['levels', 'random']) {
    $(`tab-${name}`).setAttribute('aria-selected', name === tab);
    $(`tab-${name}`).tabIndex = name === tab ? 0 : -1;
    $(`panel-${name}`).hidden = name !== tab;
  }

  const all = storage.getSolved();
  const boards = storage.getBoards();
  const started = (id) => boards[id]?.some((v) => v !== 0) ?? false;

  const packs = Object.keys(PUZZLES).map((key) => buildPack(Number(key), all, started));
  $('level-packs').replaceChildren(...packs);
  buildRandom();

  // 從隨機題回來：那一張尺寸卡不在畫面上就捲過去
  if (fromRandom) {
    const card = $('random-list').querySelector(`[data-size="${fromRandom.size}"]`);
    const { top, bottom } = card.getBoundingClientRect();
    if (top < 0 || bottom > innerHeight) card.scrollIntoView({ block: 'center' });
  }

  // 從關卡回來：捲到剛剛那一組的下一關（或剛重玩的那一關），不必自己往下找
  if (from) {
    const pack = packs.find((p) => p.dataset.size === String(from.size));
    const tile = pack.querySelector('.level.next') ?? pack.querySelector(`[data-index="${from.index}"]`);
    // 關卡格收在沒翻開的緞帶裡時，捲到那條緞帶
    const target = tile.closest('details:not([open])') ?? tile;
    const { top, bottom } = target.getBoundingClientRect();
    if (top < 0 || bottom > innerHeight) target.scrollIntoView({ block: 'center' });
  }
}

/**
 * 一組關卡。全部完成的組收成一條淡印緞帶，點開才是完整的關卡格；
 * 進行中的組只畫下一關所在那一排，之前已破的收成緞帶、之後未解鎖的收成一行
 */
function buildPack(size, all, started) {
  const puzzles = PUZZLES[size];
  const solved = solvedIn(size, all);
  const complete = solved.size === puzzles.length;
  const label = `${size}×${size}`;

  const h2 = document.createElement('h2');
  // 中間的空白讓樣式未套用或螢幕報讀時不會黏成「6×60 / 10」
  h2.innerHTML =
    `<span class="size">${label}</span> <span class="progress">已完成 ${solved.size} / ${puzzles.length}` +
    `${complete ? CHEVRON_SVG : ''}</span>`;

  const tiles = (from, to, name) => {
    const list = document.createElement('ol');
    list.className = 'level-list';
    list.setAttribute('aria-label', name);
    for (let i = from; i < to; i++) list.append(levelButton(size, i, solved, started));
    return list;
  };
  // 緞帶只印到 to 為止的最後一排，翻開才看得到全部
  const ribbon = (to) => {
    const el = document.createElement('span');
    el.className = 'ribbon';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = puzzles
      .slice(Math.max(0, to - RIBBON), to)
      .map((p) => `<span>${regionSvg(parsePuzzle(p))}</span>`)
      .join('');
    return el;
  };
  // 翻開或收起時記下來，從關卡回到列表時維持原樣
  const remember = (details, key) =>
    details.addEventListener('toggle', () => (details.open ? openPacks.add(key) : openPacks.delete(key)));

  if (complete) {
    const pack = document.createElement('details');
    pack.className = 'pack done';
    pack.dataset.size = size;
    pack.open = openPacks.has(size);
    const summary = document.createElement('summary');
    summary.append(h2, ribbon(puzzles.length));
    pack.append(summary, tiles(0, puzzles.length, label));
    remember(pack, size);
    return pack;
  }

  // 每組最前面那一關還沒破的，就是這一組的「下一關」；只完整畫出它所在的那一排
  const next = puzzles.findIndex((_, i) => !solved.has(i));
  const row = Math.floor(next / COLUMNS) * COLUMNS;
  const end = Math.min(puzzles.length, row + COLUMNS);

  const pack = document.createElement('section');
  pack.className = 'pack';
  pack.dataset.size = size;
  pack.append(h2);
  if (row > 0) {
    const earlier = document.createElement('details');
    earlier.className = 'solved-rest';
    earlier.open = openPacks.has(`${size}-solved`);
    const summary = document.createElement('summary');
    const range = `第 1–${row} 關`;
    summary.innerHTML = `<span class="head"><span>${range}</span><span class="why">已完成${CHEVRON_SVG}</span></span>`;
    summary.append(ribbon(row));
    earlier.append(summary, tiles(0, row, `${label} ${range}`));
    remember(earlier, `${size}-solved`);
    pack.append(earlier);
  }
  pack.append(tiles(row, end, label));
  if (end < puzzles.length) {
    const rest = document.createElement('p');
    rest.className = 'locked-rest';
    const range = end + 1 === puzzles.length ? `第 ${puzzles.length} 關` : `第 ${end + 1}–${puzzles.length} 關`;
    rest.innerHTML = `${LOCK_SVG}<span>${range}</span><span class="why">依序解鎖</span>`;
    pack.append(rest);
  }
  return pack;
}

function levelButton(size, i, solved, started) {
  const label = `${size}×${size}`;
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'level';
  btn.dataset.index = i;
  const unlocked = isUnlocked(i, solved);
  const done = solved.has(i);
  const inProgress = !done && started(levelId(size, i));
  btn.disabled = !unlocked;
  btn.classList.toggle('solved', done);
  btn.classList.toggle('started', inProgress);
  btn.classList.toggle('next', unlocked && !done);
  btn.innerHTML =
    (done ? printSvg(parsePuzzle(PUZZLES[size][i])) : '') +
    `<span class="num">${i + 1}</span>${done ? CHECK_SVG : unlocked ? hedgehogSvg('peek') : LOCK_SVG}`;
  btn.setAttribute(
    'aria-label',
    `${label} 第 ${i + 1} 關${done ? '，已完成' : inProgress ? '，玩到一半' : unlocked ? '' : '，未解鎖'}`,
  );
  btn.addEventListener('click', () => go({ size, index: i }));
  li.append(btn);
  return li;
}

/** 隨機出題：每個尺寸一張卡。有玩到一半的就接著玩那一題，否則抽一個新種子 */
function buildRandom() {
  const solved = storage.getRandomSolved();
  const cards = Object.keys(PUZZLES).map((key) => {
    const size = Number(key);
    const current = storage.getRandom(size);
    const count = solved[size] ?? 0;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level dice';
    btn.dataset.size = size;
    btn.classList.toggle('started', current !== null);
    btn.innerHTML = `<span class="num">${size}×${size}</span><span class="count">${count ? `已解 ${count} 題` : '還沒解過'}</span>`;
    btn.setAttribute(
      'aria-label',
      `隨機 ${size}×${size}${current ? '，玩到一半' : ''}${count ? `，已解 ${count} 題` : ''}`,
    );
    btn.addEventListener('click', () => (location.hash = randomId(size, current?.seed ?? newSeed())));
    li.append(btn);
    return li;
  });
  $('random-list').replaceChildren(...cards);
}

// ---------- 遊戲畫面 ----------

function openLevel(size, index) {
  level = { size, index };
  lesson = random = null;
  const id = levelId(size, index);
  const puzzle = parsePuzzle(PUZZLES[size][index]);
  game = new Game(puzzle, storage.getBoard(id), storage.getTrial(id));

  showGame(`${size}×${size} 第 ${index + 1} 關`);

  buildBoard(puzzle);
  // 回到存檔的盤面：墨跡本來就在紙上，不重寫一次
  render(new Set(), { instant: true });
}

/** 隨機題：當場依種子出題。存著的盤面是同一個種子才接著玩，別人分享的網址從空盤開始 */
function openRandom(size, seed) {
  level = lesson = null;
  random = { size, seed };
  const puzzle = parsePuzzle(generate(size, seed));
  const saved = storage.getRandom(size);
  game = new Game(puzzle, ...(saved?.seed === seed ? [saved.board, saved.trial] : []));

  showGame(`隨機 ${size}×${size}`);

  buildBoard(puzzle);
  render(new Set(), { instant: true });
}

/** 教學：同一張棋盤、同一套操作，棋盤上方多一行引導；不存盤面，每次都從頭開始 */
function openLesson() {
  level = random = null;
  lesson = { step: 0 };
  game = new Game(parsePuzzle(LESSON));

  showGame('怎麼玩');
  coach();

  buildBoard(game.puzzle);
  render(new Set(), { instant: true });
}

/** 桌面規則一律展開；手機照自己上次的選擇，沒動過就只在還沒破過任何一題（固定或隨機）時展開 */
function rulesOpen() {
  if (desktop.matches) return true;
  const chosen = storage.getRulesOpen();
  if (chosen !== null) return chosen;
  return storage.getSolved().size === 0 && Object.keys(storage.getRandomSolved()).length === 0;
}

function showGame(title) {
  showView('game-view');
  clearWin();
  // 從列表下方點進來、或在過關後按下一關，都從頁頂的標題和棋盤開始
  scrollTo(0, 0);
  $('level-title').textContent = title;
  $('game-view').classList.toggle('lesson', lesson !== null);
  // 教學本身就在教規則，規則欄先收起來，畫面只留引導和棋盤
  $('rules').hidden = lesson !== null;
  $('rules').open = rulesOpen();
  $('coach').hidden = lesson === null;
  // 隨機題才有「換一題」
  $('shuffle').hidden = random === null;
  $('controls').classList.toggle('four', random !== null);
}

/** 換成目前這一步的引導；文字沒變就不動，免得報讀器重念 */
function coach() {
  const el = $('coach');
  const text = STEPS[lesson.step].text;
  if (el.textContent === text) return;
  el.textContent = text;
  // 換一步時引導文字輕輕浮上來，讓人注意到換了
  el.classList.remove('fresh');
  void el.offsetWidth;
  el.classList.add('fresh');
}

function buildBoard(puzzle) {
  const board = $('board');
  board.style.setProperty('--n', puzzle.size);
  board.classList.remove('locked', 'solved');
  cells = regionCells(puzzle);
  board.replaceChildren(...cells);
  shown = new Array(cells.length).fill(EMPTY);
}

/** 一格一格塗上色塊色、畫出色塊邊界；遊戲盤和技巧頁的圖解共用 */
function regionCells({ size, regions }) {
  return regions.map((region, i) => {
    const r = Math.floor(i / size), c = i % size;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.style.setProperty('--region', `var(--r${region})`);
    // 色塊邊界加粗
    if (r === 0 || regions[i - size] !== region) cell.classList.add('bt');
    if (c === 0 || regions[i - 1] !== region) cell.classList.add('bl');
    if (r === size - 1 || regions[i + size] !== region) cell.classList.add('bb');
    if (c === size - 1 || regions[i + 1] !== region) cell.classList.add('br');
    return cell;
  });
}

// ---------- 解題技巧：靜態圖解，不能點 ----------

/** 技巧頁：內容固定，第一次打開才畫；從網站裡點進來的，「返回」就回到原本那一頁 */
function openTips(fromApp) {
  level = lesson = random = game = null;
  clearWin();
  tipsFromApp = fromApp;
  if (!$('tips-list').firstChild) $('tips-list').replaceChildren(...TIPS.map(buildTip));
  showView('tips-view');
  scrollTo(0, 0);
}

function buildTip(tip, n) {
  const li = document.createElement('li');
  li.className = 'tip';
  li.classList.toggle('pair', tip.figures.length > 1);
  const h2 = document.createElement('h2');
  h2.innerHTML = `<span class="tip-num">${n + 1}</span>`;
  h2.append(tip.title);
  const figs = document.createElement('div');
  figs.className = 'tip-figs';
  figs.append(...tip.figures.map(buildFigure));
  const text = document.createElement('p');
  text.textContent = tip.text;
  li.append(h2, figs, text);
  return li;
}

// 圖解上每一種墨跡畫成什麼：刺蝟或 ✕，再加上說明它是哪一種的 class
const FIGURE_INK = {
  Q: [QUEEN],
  x: [MARK],
  '*': [QUEEN, 'got-q'],
  '+': [MARK, 'got'],
  '?': [QUEEN, 'maybe'],
  '~': [MARK, 'maybe'],
};

function buildFigure({ regions, ink, look, caption }) {
  const figure = document.createElement('figure');
  const board = document.createElement('div');
  board.className = 'board mini';
  board.setAttribute('aria-hidden', 'true');
  const puzzle = parsePuzzle(regions);
  board.style.setProperty('--n', puzzle.size);
  const figCells = regionCells(puzzle);
  for (const [ch, [state, cls]] of Object.entries(FIGURE_INK)) {
    for (const i of cellsOf(ink, ch)) {
      figCells[i].insertAdjacentHTML('beforeend', state === QUEEN ? queenSvg() : markSvg());
      if (cls) figCells[i].classList.add(cls);
    }
  }
  for (const i of cellsOf(look, 'o')) figCells[i].classList.add('look');
  for (const i of cellsOf(look, '!')) figCells[i].classList.add('conflict');
  board.replaceChildren(...figCells);
  figure.append(board);
  if (caption) {
    const cap = document.createElement('figcaption');
    cap.textContent = caption;
    figure.append(cap);
  }
  return figure;
}

function render(preview = new Set(), { instant = false } = {}) {
  const conflicts = findConflicts(game.puzzle, game.board);
  // 教學中這一步要玩家動的格子會亮起；過關後就不再提示
  const step = lesson && !game.solved ? STEPS[lesson.step] : null;
  const lit = new Set(step ? targets(step, game.board) : []);
  // 標記中畫的格子用虛線；拖曳經過、還沒放開的空格也算
  const tentative = game.tentative;
  const changed = [];
  game.board.forEach((state, i) => {
    const drawn = state === EMPTY && preview.has(i);
    const next = drawn ? MARK : state;
    if (drawn && game.trying) tentative.add(i);
    cells[i].classList.toggle('queen', next === QUEEN);
    cells[i].classList.toggle('mark', next === MARK);
    cells[i].classList.toggle('conflict', conflicts.has(i));
    cells[i].classList.toggle('target', lit.has(i));
    if (next !== shown[i]) changed.push([i, next]);
  });
  $('board').classList.toggle('trying', game.trying);
  $('trial-tag').hidden = !game.trying;

  if (instant) conflictCount = conflicts.size;
  const animate = !instant && !reducedMotion.matches;
  // 一次改很多格（重來、撤銷一整次拖曳或重來）時，墨跡沿對角線由左上一路掃過去
  const n = game.puzzle.size;
  const sweep = changed.length > 1 ? Math.min(24, 380 / (2 * n - 2)) : 0;
  for (const [i, next] of changed) {
    const delay = sweep * (Math.floor(i / n) + (i % n));
    ink(cells[i], shown[i], next, animate, delay);
    shown[i] = next;
  }
  // 虛線掛在墨跡上而不是格子上：擦掉時正在收回的那一筆維持虛線，不會先變回實線
  cells.forEach((cell, i) => cell.querySelector('svg:not(.out)')?.classList.toggle('trial', tentative.has(i)));

  $('undo').disabled = game.solved || !game.canUndo;
  // 盤面已經是空的，「重來」沒有東西可清
  $('reset').disabled = game.solved || game.board.every((v) => v === EMPTY);
  $('trial').disabled = $('keep').disabled = $('erase').disabled = game.solved;
  // 標記中「留下」「擦掉」取代「重來」「標記」；按鈕被藏起來時焦點跟著搬到換上來的那一顆
  showButtons(['reset', 'trial'], ['keep', 'erase'], game.trying);
  for (const id of ['undo', 'trial', 'erase']) $(id).classList.toggle('target', step?.button === id);
}

/** 兩組按鈕換著顯示：on 為真時顯示 b、藏起 a；焦點在被藏起來的那顆上時，搬到另一組同位置的那顆 */
function showButtons(a, b, on) {
  const [hide, show] = on ? [a, b] : [b, a];
  const focused = hide.indexOf(document.activeElement?.id);
  hide.forEach((id) => ($(id).hidden = true));
  show.forEach((id) => ($(id).hidden = false));
  if (focused >= 0) $(show[focused]).focus({ preventScroll: true });
}

/** 把一格從 from 改畫成 to：✕ 一筆一筆描出、反向收回；刺蝟蓋下、提起 */
function ink(cell, from, to, animate, delay) {
  // 上一次還沒收完的墨跡直接拿掉，避免同一格疊兩層
  cell.querySelectorAll('svg.out').forEach((el) => el.remove());
  const old = cell.querySelector('svg');
  if (old) {
    // ✕ 直接換成刺蝟時不收筆，讓章蓋在上面
    if (animate && to === EMPTY) {
      old.classList.remove('in');
      old.classList.add('out');
      old.style.setProperty('--d', `${delay}ms`);
      setTimeout(() => old.remove(), delay + LEAVE_MS[from]);
    } else {
      old.remove();
    }
  }
  if (to === EMPTY) return;
  cell.insertAdjacentHTML('beforeend', to === QUEEN ? queenSvg() : markSvg());
  if (animate) {
    const el = cell.lastElementChild;
    el.classList.add('in');
    el.style.setProperty('--d', `${delay}ms`);
  }
}

function afterChange() {
  // 放下去會刺到別人：「啵」之後接一聲「咚」；過關的那一下不算
  const conflicts = findConflicts(game.puzzle, game.board).size;
  if (conflicts > conflictCount && !game.solved) sound.play('conflict');
  conflictCount = conflicts;
  if (lesson) {
    if (game.solved) {
      render();
      showWin(lessonWin());
      return;
    }
    lesson.step = currentStep(game.puzzle, game.board, lesson.step, game.trial);
    render();
    coach();
    return;
  }
  if (random) {
    // 問著「確定要換嗎？」時又去動盤面，就當作不換了
    ask(false);
    const { size, seed } = random;
    if (game.solved) storage.markRandomSolved(size);
    else storage.saveRandom(size, seed, game.board, game.trial);
    render();
    if (game.solved) {
      showWin({ title: '過關！', seal: '過關', next: { label: '再來一題', hash: randomId(size, newSeed()) } });
    }
    return;
  }
  if (game.solved) {
    storage.markSolved(levelId(level.size, level.index));
    render();
    showWin(levelWin());
  } else {
    storage.saveBoard(levelId(level.size, level.index), game.board, game.trial);
    render();
  }
}

/** 一般關卡的過關面板：下一關，或一組全破時挑戰下一個尺寸；最大的尺寸也破完了就來隨機題 */
function levelWin() {
  const { size, index } = level;
  const last = index === PUZZLES[size].length - 1;
  const nextSize = last ? Object.keys(PUZZLES).map(Number).find((s) => s > size) : null;
  return {
    title: last ? `${size}×${size} 全部完成！` : '過關！',
    seal: '過關',
    next: !last
      ? { label: '下一關', hash: levelId(size, index + 1) }
      : nextSize
        ? { label: `挑戰 ${nextSize}×${nextSize}`, hash: levelId(nextSize, 0) }
        : { label: `隨機 ${size}×${size}`, hash: randomId(size, newSeed()) },
  };
}

/** 教學做完：直接帶去最小尺寸裡還沒破的第一關 */
function lessonWin() {
  const solved = storage.getSolved();
  const size = Object.keys(PUZZLES).map(Number).find((s) => solvedIn(s, solved).size < PUZZLES[s].length);
  const index = size ? PUZZLES[size].findIndex((_, i) => !solved.has(levelId(size, i))) : -1;
  return {
    title: '學會了！',
    seal: '學會',
    next: size && { label: `開始 ${size}×${size} 第 ${index + 1} 關`, hash: levelId(size, index) },
  };
}

// 過關的節奏：刺蝟由上而下依序蓋印 → 操作列換成過關面板 → 頁邊蓋上「過關」章。
// 盤面一直留在畫面上，玩家可以看著自己解開的那一頁。
function showWin({ title, seal, next: target }) {
  const board = $('board');
  board.classList.add('locked', 'solved');
  const queens = cells.filter((cell) => cell.classList.contains('queen'));
  queens.forEach((cell, order) => cell.style.setProperty('--order', order));

  // 一般過關只留頁邊的紅印章；綠字標題只在有額外的話要說時（全部完成、學會了）才出現
  const quiet = title === '過關！';
  $('win').classList.toggle('quiet', quiet);
  $('win-title').textContent = title;
  $('seal').firstElementChild.textContent = seal;
  const next = $('win-next');
  next.hidden = !target;
  if (target) {
    next.textContent = target.label;
    next.dataset.target = target.hash;
  }

  const panelAt = reducedMotion.matches ? 0 : queens.length * 90 + 180;
  const stampAt = reducedMotion.matches ? 0 : panelAt + 240;
  // 刺蝟跳一隻響一個音，印章壓到紙上（stamp 動畫的 60%）時「咚」；沒有動畫時音階一口氣跑完再蓋章
  sound.play('cheer', queens.length, reducedMotion.matches ? 0.05 : 0.09);
  sound.play('stamp', reducedMotion.matches ? queens.length * 0.05 + 0.15 : (stampAt + 250) / 1000);
  winTimers.push(
    setTimeout(() => {
      // 焦點原本在操作列（例如用鍵盤按的）才跟著搬到過關面板；用手指解開時不冒出焦點框
      const hadFocus = $('controls').contains(document.activeElement);
      $('controls').hidden = true;
      $('win').hidden = false;
      if (hadFocus) (next.hidden ? $('win-list') : next).focus({ preventScroll: true });
    }, panelAt),
    setTimeout(() => ($('seal').hidden = false), stampAt),
  );
}

function clearWin() {
  winTimers.forEach(clearTimeout);
  winTimers = [];
  $('seal').hidden = true;
  $('win').hidden = true;
  $('ask').hidden = true;
  $('controls').hidden = false;
}

// ---------- 指標操作：點擊循環、拖曳標 ✕（滑鼠與觸控共用） ----------

let drag = null;

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.cell');
  return el && el.parentElement === $('board') ? Number(el.dataset.index) : null;
}

function cancelDrag() {
  if (drag) cells[drag.start].classList.remove('pressed');
  drag = null;
  render();
}

$('board').addEventListener('pointerdown', (e) => {
  // 第二根手指落下代表要縮放，放棄這次點擊／拖曳，不留任何標記
  if (!e.isPrimary) { if (drag) cancelDrag(); return; }
  if (!game || game.solved || e.button !== 0) return;
  const start = cellAt(e.clientX, e.clientY);
  if (start === null) return;
  e.preventDefault();
  $('board').setPointerCapture(e.pointerId);
  cells[start].classList.add('pressed');
  drag = { start, cells: new Set([start]), moved: false };
});

$('board').addEventListener('pointermove', (e) => {
  if (!drag) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i === null || drag.cells.has(i)) return;
  drag.cells.add(i);
  // 拖曳經過空格時劃一筆
  if (game.board[i] === EMPTY || (!drag.moved && game.board[drag.start] === EMPTY)) sound.play('mark', 1);
  drag.moved = true;
  render(drag.cells);
});

$('board').addEventListener('pointerup', () => {
  if (!drag) return;
  const { start, cells: touched, moved } = drag;
  drag = null;
  cells[start].classList.remove('pressed');
  if (moved ? game.mark(touched) : game.cycle(start)) {
    if (!moved) sound.play({ [MARK]: 'mark', [QUEEN]: 'queen', [EMPTY]: 'lift' }[game.board[start]]);
    afterChange();
  } else render();
});

$('board').addEventListener('pointercancel', cancelDrag);

// iOS Safari 不一定尊重 touch-action 的雙擊放大限制；單指放開時擋掉預設行為。
// 盤面只用 pointer 事件，擋 touchend 不影響點擊判定。
$('board').addEventListener('touchend', (e) => {
  if (e.touches.length === 0 && e.changedTouches.length === 1) e.preventDefault();
}, { passive: false });

// ---------- 按鈕 ----------

$('undo').addEventListener('click', () => {
  if (game && !game.solved && game.undo()) {
    sound.play('undo');
    afterChange();
  }
});

$('reset').addEventListener('click', () => {
  if (game && !game.solved && game.reset()) {
    sound.play('reset');
    afterChange();
  }
});

// 標記：之後畫的都是試放（虛線），再決定留下或擦掉
$('trial').addEventListener('click', () => {
  if (game && !game.solved && game.startTrial()) afterChange();
});

$('keep').addEventListener('click', () => {
  if (!game || game.solved) return;
  const kept = [...game.tentative];
  if (!game.keep()) return;
  afterChange();
  // 虛線描成實線：輕輕定下來
  if (!reducedMotion.matches) {
    for (const i of kept) {
      cells[i].classList.remove('settle');
      void cells[i].offsetWidth;
      cells[i].classList.add('settle');
    }
  }
});

$('erase').addEventListener('click', () => {
  if (game && !game.solved && game.erase()) {
    sound.play('erase');
    afterChange();
  }
});

// 換一題：同尺寸抽新種子，這一盤放掉；用 replace 不留歷史，按返回不會回到被換掉的那題
function shuffle() {
  if (!random || game.solved) return;
  storage.clearRandom(random.size);
  location.replace(`#${randomId(random.size, newSeed())}`);
}

/** 操作列換成「確定要換嗎？」，或換回來；焦點跟著搬，用鍵盤操作時不會掉到頁面最上面 */
function ask(show) {
  if ($('ask').hidden === !show) return;
  const hadFocus = (show ? $('controls') : $('ask')).contains(document.activeElement);
  $('controls').hidden = show;
  $('ask').hidden = !show;
  if (hadFocus) (show ? $('ask-no') : $('shuffle')).focus({ preventScroll: true });
}

// 盤面還是空的就直接換，有填東西才先問一句
$('shuffle').addEventListener('click', () => {
  if (game?.board.every((v) => v === EMPTY)) shuffle();
  else ask(true);
});
$('ask-yes').addEventListener('click', shuffle);
$('ask-no').addEventListener('click', () => ask(false));

$('back').addEventListener('click', goList);
$('learn').addEventListener('click', () => (location.hash = 'learn'));
$('tips').addEventListener('click', () => (location.hash = 'tips'));
// 從列表或關卡點進來的回到原本那一頁；直接開技巧頁網址的，回關卡列表
$('tips-back').addEventListener('click', () => (tipsFromApp ? history.back() : (location.hash = '')));
$('win-list').addEventListener('click', goList);

// 列表的分頁：換頁不留在上一頁的歷史裡，按瀏覽器返回不會在兩頁之間來回跳
function switchTab(name) {
  history.replaceState(null, '', name === 'random' ? '#random' : location.pathname);
  showLevels(name);
}
$('tab-levels').addEventListener('click', () => switchTab('levels'));
$('tab-random').addEventListener('click', () => switchTab('random'));
// 左右方向鍵在兩個分頁之間移動
$('tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const name = $('tab-levels').getAttribute('aria-selected') === 'true' ? 'random' : 'levels';
  switchTab(name);
  $(`tab-${name}`).focus();
});
$('win-next').addEventListener('click', (e) => (location.hash = e.currentTarget.dataset.target));

// 手機上自己點過規則的頁邊籤，之後每一關都照這個選擇，不再自動打開或收起
$('rules').querySelector('summary').addEventListener('click', () => storage.setRulesOpen(!$('rules').open));

// 視窗跨過桌面寬度時，規則跟著展開（桌面沒有收合開關）
desktop.addEventListener('change', () => {
  if (desktop.matches) $('rules').open = true;
});

// 音效開關：預設打開；打開時「啵」一聲，順便讓瀏覽器准許之後出聲
function showSound() {
  $('sound').setAttribute('aria-pressed', storage.getSound());
}
sound.setEnabled(storage.getSound());
showSound();
$('sound').addEventListener('click', () => {
  const on = !storage.getSound();
  storage.setSound(on);
  sound.setEnabled(on);
  showSound();
  sound.play('queen');
});
// 瀏覽器只在使用者手勢當下准許出聲：重新載入後，第一次碰畫面就把聲音喚醒
for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  document.addEventListener(type, sound.unlock, { capture: true, passive: true });
}

// 刊頭、教學卡、規則裡的刺蝟都是同一隻
document.querySelectorAll('span.hedgehog').forEach((el) => (el.innerHTML = hedgehogSvg()));

// 刊頭的刺蝟：戳一下會跳起來
$('mascot').addEventListener('click', (e) => {
  const el = e.currentTarget;
  el.classList.remove('hop');
  void el.offsetWidth;
  el.classList.add('hop');
});

// 已破關卡重玩：存檔盤面已在破關時清除，因此會從空盤面開始。
window.addEventListener('hashchange', route);
route();

// 離線遊玩：service worker 把整個遊戲存起來（file:// 或不支援的瀏覽器就略過）
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
