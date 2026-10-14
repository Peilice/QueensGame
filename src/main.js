import { parsePuzzle, findConflicts, EMPTY, MARK, QUEEN } from './rules.js';
import { Game, isUnlocked } from './game.js';
import { PUZZLES } from './puzzles.js';
import * as storage from './storage.js';
import { LESSON, STEPS, currentStep, targets } from './tutorial.js';

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

/** 刺蝟（側面、頭朝右）：背上一排刺、挖空的眼睛、圓鼻頭、兩隻小腳 */
const HEDGEHOG =
  '<g transform="translate(1.3 0.7) scale(0.94)">' +
  '<path fill-rule="evenodd" d="M2.18 16.9L-1.18 14.51L2.44 12.54L0.79 8.77L4.91 8.94L5.43 4.85L8.88 7.11L11.43 3.87L13.22 7.58L17.08 6.11L16.71 10.21L20.77 10.93Q20 11.6 22.4 15.4Q23 16.6 21.7 17.3Q19.6 18.6 17.2 18.8L4.6 18.8Q1.6 18.6 1.8 16.4zM16.05 13.9a1.45 1.45 0 1 0 2.9 0a1.45 1.45 0 1 0 -2.9 0z"/>' +
  '<rect x="5.4" y="18" width="3" height="3.6" rx="1.5"/><rect x="13.2" y="18" width="3" height="3.6" rx="1.5"/>' +
  '<circle cx="22.2" cy="15.9" r="1.3"/></g>';

/** 刺蝟像手蓋的章，角度微歪，墨色紋理三選一 */
const queenSvg = () =>
  `<svg class="q" viewBox="0 0 24 24" aria-hidden="true"><g filter="url(#ink-${Math.floor(Math.random() * 3)})" transform="rotate(${fmt(wobble(3.5))} 12 13)">${HEDGEHOG}</g></svg>`;

// 墨跡離場的時間（和 style.css 的 pen-out／lift 對齊），之後才從 DOM 移除
const LEAVE_MS = { [MARK]: 200, [QUEEN]: 160 };

let level = null; // { size, index }
let lesson = null; // 教學進行中：{ step }，和 level 不會同時有值
let game = null;
let cells = [];
let shown = []; // 每格目前畫在紙上的狀態，只有變了才重畫
let winTimers = [];

const desktop = matchMedia('(min-width: 760px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const levelId = (size, index) => `${size}-${index + 1}`;

/** 某尺寸已破關的索引集合 */
function solvedIn(size, solved = storage.getSolved()) {
  return new Set(PUZZLES[size].flatMap((_, i) => (solved.has(levelId(size, i)) ? [i] : [])));
}

// ---------- 路由：#6-3 代表 6×6 第 3 關，#learn 是教學，空白代表關卡列表 ----------

function route() {
  if (location.hash === '#learn') return openLesson();
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

// ---------- 關卡列表 ----------

// 關卡格一排幾格，要和 style.css 的 .level-list 欄數一致
const COLUMNS = 5;
// 緞帶只印最後幾題、固定一排，要和 style.css 的 .ribbon 欄數一致
const RIBBON = 10;

// 這次瀏覽中翻開過的已完成組（鍵是尺寸）和進行中組的已破段落（鍵是「尺寸-solved」）：從關卡回到列表時維持翻開
const openPacks = new Set();

function showLevels() {
  const from = level;
  level = lesson = game = null;
  clearWin();
  $('game-view').hidden = true;
  $('levels-view').hidden = false;

  const all = storage.getSolved();
  const boards = storage.getBoards();
  const started = (id) => boards[id]?.some((v) => v !== 0) ?? false;

  const packs = Object.keys(PUZZLES).map((key) => buildPack(Number(key), all, started));
  $('level-packs').replaceChildren(...packs);

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
    `${label} <span class="progress">已完成 ${solved.size} / ${puzzles.length}` +
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
    `<span class="num">${i + 1}</span>${done ? CHECK_SVG : unlocked ? '' : LOCK_SVG}`;
  btn.setAttribute(
    'aria-label',
    `${label} 第 ${i + 1} 關${done ? '，已完成' : inProgress ? '，玩到一半' : unlocked ? '' : '，未解鎖'}`,
  );
  btn.addEventListener('click', () => go({ size, index: i }));
  li.append(btn);
  return li;
}

// ---------- 遊戲畫面 ----------

function openLevel(size, index) {
  level = { size, index };
  lesson = null;
  const id = levelId(size, index);
  const puzzle = parsePuzzle(PUZZLES[size][index]);
  game = new Game(puzzle, storage.getBoard(id));

  showGame(`${size}×${size} 第 ${index + 1} 關`);
  // 桌面規則一律展開；手機只在還沒破過任何一關時預設展開，之後收成頁邊籤
  $('rules').open = desktop.matches || storage.getSolved().size === 0;

  buildBoard(puzzle);
  // 回到存檔的盤面：墨跡本來就在紙上，不重寫一次
  render(new Set(), { instant: true });
}

/** 教學：同一張棋盤、同一套操作，棋盤上方多一行引導；不存盤面，每次都從頭開始 */
function openLesson() {
  level = null;
  lesson = { step: 0 };
  game = new Game(parsePuzzle(LESSON));

  showGame('怎麼玩');
  coach();

  buildBoard(game.puzzle);
  render(new Set(), { instant: true });
}

function showGame(title) {
  $('levels-view').hidden = true;
  $('game-view').hidden = false;
  clearWin();
  $('level-title').textContent = title;
  // 教學本身就在教規則，規則欄先收起來，畫面只留引導和棋盤
  $('rules').hidden = lesson !== null;
  $('coach').hidden = lesson === null;
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

function buildBoard({ size, regions }) {
  const board = $('board');
  board.style.setProperty('--n', size);
  board.classList.remove('locked', 'solved');
  cells = regions.map((region, i) => {
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
  board.replaceChildren(...cells);
  shown = new Array(cells.length).fill(EMPTY);
}

function render(preview = new Set(), { instant = false } = {}) {
  const conflicts = findConflicts(game.puzzle, game.board);
  // 教學中這一步要玩家動的格子會亮起；過關後就不再提示
  const step = lesson && !game.solved ? STEPS[lesson.step] : null;
  const lit = new Set(step ? targets(step, game.board) : []);
  const changed = [];
  game.board.forEach((state, i) => {
    const next = state === EMPTY && preview.has(i) ? MARK : state;
    cells[i].classList.toggle('queen', next === QUEEN);
    cells[i].classList.toggle('mark', next === MARK);
    cells[i].classList.toggle('conflict', conflicts.has(i));
    cells[i].classList.toggle('target', lit.has(i));
    if (next !== shown[i]) changed.push([i, next]);
  });

  const animate = !instant && !reducedMotion.matches;
  // 一次改很多格（重來、撤銷一整次拖曳或重來）時，墨跡沿對角線由左上一路掃過去
  const n = game.puzzle.size;
  const sweep = changed.length > 1 ? Math.min(24, 380 / (2 * n - 2)) : 0;
  for (const [i, next] of changed) {
    const delay = sweep * (Math.floor(i / n) + (i % n));
    ink(cells[i], shown[i], next, animate, delay);
    shown[i] = next;
  }

  $('undo').disabled = game.solved || !game.canUndo;
  $('undo').classList.toggle('target', step?.undo === true);
  // 盤面已經是空的，「重來」沒有東西可清
  $('reset').disabled = game.solved || game.board.every((v) => v === EMPTY);
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
  if (lesson) {
    if (game.solved) {
      render();
      showWin(lessonWin());
      return;
    }
    lesson.step = currentStep(game.puzzle, game.board, lesson.step);
    render();
    coach();
    return;
  }
  if (game.solved) {
    storage.markSolved(levelId(level.size, level.index));
    render();
    showWin(levelWin());
  } else {
    storage.saveBoard(levelId(level.size, level.index), game.board);
    render();
  }
}

/** 一般關卡的過關面板：下一關，或一組全破時挑戰下一個尺寸 */
function levelWin() {
  const { size, index } = level;
  const last = index === PUZZLES[size].length - 1;
  const nextSize = last ? Object.keys(PUZZLES).map(Number).find((s) => s > size) : null;
  return {
    title: last ? `${size}×${size} 全部完成！` : '過關！',
    seal: '過關',
    next: !last
      ? { label: '下一關', hash: levelId(size, index + 1) }
      : nextSize && { label: `挑戰 ${nextSize}×${nextSize}`, hash: levelId(nextSize, 0) },
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
  drag.moved = true;
  render(drag.cells);
});

$('board').addEventListener('pointerup', () => {
  if (!drag) return;
  const { start, cells: touched, moved } = drag;
  drag = null;
  cells[start].classList.remove('pressed');
  if (moved ? game.mark(touched) : game.cycle(start)) afterChange();
  else render();
});

$('board').addEventListener('pointercancel', cancelDrag);

// iOS Safari 不一定尊重 touch-action 的雙擊放大限制；單指放開時擋掉預設行為。
// 盤面只用 pointer 事件，擋 touchend 不影響點擊判定。
$('board').addEventListener('touchend', (e) => {
  if (e.touches.length === 0 && e.changedTouches.length === 1) e.preventDefault();
}, { passive: false });

// ---------- 按鈕 ----------

$('undo').addEventListener('click', () => {
  if (game && !game.solved && game.undo()) afterChange();
});

$('reset').addEventListener('click', () => {
  if (game && !game.solved && game.reset()) afterChange();
});

$('back').addEventListener('click', () => go(null));
$('learn').addEventListener('click', () => (location.hash = 'learn'));
$('win-list').addEventListener('click', () => go(null));
$('win-next').addEventListener('click', (e) => (location.hash = e.currentTarget.dataset.target));

// 視窗跨過桌面寬度時，規則跟著展開（桌面沒有收合開關）
desktop.addEventListener('change', () => {
  if (desktop.matches) $('rules').open = true;
});

// 已破關卡重玩：存檔盤面已在破關時清除，因此會從空盤面開始。
window.addEventListener('hashchange', route);
route();
