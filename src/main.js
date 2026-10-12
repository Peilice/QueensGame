import { parsePuzzle, findConflicts, EMPTY, MARK, QUEEN } from './rules.js';
import { Game, isUnlocked } from './game.js';
import { PUZZLES } from './puzzles.js';
import * as storage from './storage.js';

const $ = (id) => document.getElementById(id);

// 關卡格右上角的狀態小圖示：同一套線條粗細
const CHECK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const LOCK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/** 已破關卡在目錄上的淡印：那一題的色塊縮圖加上色塊邊界，像印在目錄頁上的小圖 */
function printSvg({ size, regions }) {
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
  return `<span class="print" aria-hidden="true"><svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="none">${fills}<path d="${edges}"/></svg></span>`;
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

/** 皇后：像手蓋的章，角度微歪，墨色紋理三選一 */
const queenSvg = () =>
  `<svg class="q" viewBox="0 0 24 24" aria-hidden="true"><g filter="url(#ink-${Math.floor(Math.random() * 3)})" transform="rotate(${fmt(wobble(3.5))} 12 13)"><path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5z"/><rect x="5" y="20" width="14" height="2" rx="1"/></g></svg>`;

// 墨跡離場的時間（和 style.css 的 pen-out／lift 對齊），之後才從 DOM 移除
const LEAVE_MS = { [MARK]: 200, [QUEEN]: 160 };

let level = null; // { size, index }
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

// ---------- 路由：#6-3 代表 6×6 第 3 關，空白代表關卡列表 ----------

function route() {
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

function showLevels() {
  level = game = null;
  clearWin();
  $('game-view').hidden = true;
  $('levels-view').hidden = false;

  const all = storage.getSolved();
  const boards = storage.getBoards();
  const started = (id) => boards[id]?.some((v) => v !== 0) ?? false;

  $('level-packs').replaceChildren(
    ...Object.keys(PUZZLES).map((key) => {
      const size = Number(key);
      const solved = solvedIn(size, all);
      const section = document.createElement('section');
      section.className = 'pack';
      const label = `${size}×${size}`;
      const h2 = document.createElement('h2');
      // 中間的空白讓樣式未套用或螢幕報讀時不會黏成「6×60 / 10」
      h2.innerHTML = `${label} <span class="progress">已完成 ${solved.size} / ${PUZZLES[size].length}</span>`;
      const list = document.createElement('ol');
      list.className = 'level-list';
      list.setAttribute('aria-label', label);
      list.append(
        ...PUZZLES[size].map((_, i) => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'level';
          const unlocked = isUnlocked(i, solved);
          const done = solved.has(i);
          const inProgress = !done && started(levelId(size, i));
          btn.disabled = !unlocked;
          btn.classList.toggle('solved', done);
          btn.classList.toggle('started', inProgress);
          // 每組最前面那一關還沒破的，就是這一組的「下一關」
          btn.classList.toggle('next', unlocked && !done && (i === 0 || solved.has(i - 1)));
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
        }),
      );
      section.append(h2, list);
      return section;
    }),
  );
}

// ---------- 遊戲畫面 ----------

function openLevel(size, index) {
  level = { size, index };
  const id = levelId(size, index);
  const puzzle = parsePuzzle(PUZZLES[size][index]);
  game = new Game(puzzle, storage.getBoard(id));

  $('levels-view').hidden = true;
  $('game-view').hidden = false;
  clearWin();
  // 桌面規則一律展開；手機只在還沒破過任何一關時預設展開，之後收成頁邊籤
  $('rules').open = desktop.matches || storage.getSolved().size === 0;
  $('level-title').textContent = `${size}×${size} 第 ${index + 1} 關`;

  buildBoard(puzzle);
  // 回到存檔的盤面：墨跡本來就在紙上，不重寫一次
  render(new Set(), { instant: true });
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
  const changed = [];
  game.board.forEach((state, i) => {
    const next = state === EMPTY && preview.has(i) ? MARK : state;
    cells[i].classList.toggle('queen', next === QUEEN);
    cells[i].classList.toggle('mark', next === MARK);
    cells[i].classList.toggle('conflict', conflicts.has(i));
    if (next !== shown[i]) changed.push([i, next]);
  });

  const animate = !instant && !reducedMotion.matches;
  // 一次改很多格（重來、撤銷一整次拖曳或重來）時，墨跡沿對角線由左上一路掃過去
  const n = game.puzzle.size;
  const step = changed.length > 1 ? Math.min(24, 380 / (2 * n - 2)) : 0;
  for (const [i, next] of changed) {
    const delay = step * (Math.floor(i / n) + (i % n));
    ink(cells[i], shown[i], next, animate, delay);
    shown[i] = next;
  }

  $('undo').disabled = game.solved || !game.canUndo;
  $('reset').disabled = game.solved;
}

/** 把一格從 from 改畫成 to：✕ 一筆一筆描出、反向收回；皇后蓋下、提起 */
function ink(cell, from, to, animate, delay) {
  // 上一次還沒收完的墨跡直接拿掉，避免同一格疊兩層
  cell.querySelectorAll('svg.out').forEach((el) => el.remove());
  const old = cell.querySelector('svg');
  if (old) {
    // ✕ 直接換成皇后時不收筆，讓章蓋在上面
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
  if (game.solved) {
    storage.markSolved(levelId(level.size, level.index));
    render();
    showWin();
  } else {
    storage.saveBoard(levelId(level.size, level.index), game.board);
    render();
  }
}

// 過關的節奏：皇后由上而下依序蓋印 → 操作列換成過關面板 → 頁邊蓋上「過關」章。
// 盤面一直留在畫面上，玩家可以看著自己解開的那一頁。
function showWin() {
  const board = $('board');
  board.classList.add('locked', 'solved');
  const queens = cells.filter((cell) => cell.classList.contains('queen'));
  queens.forEach((cell, order) => cell.style.setProperty('--order', order));

  const { size, index } = level;
  const last = index === PUZZLES[size].length - 1;
  const nextSize = last ? Object.keys(PUZZLES).map(Number).find((s) => s > size) : null;
  $('win-title').textContent = last ? `${size}×${size} 全部完成！` : '過關！';
  const next = $('win-next');
  next.hidden = last && !nextSize;
  next.textContent = last ? `挑戰 ${nextSize}×${nextSize}` : '下一關';
  next.dataset.target = last ? `${nextSize}-0` : `${size}-${index + 1}`;

  const panelAt = reducedMotion.matches ? 0 : queens.length * 90 + 180;
  const stampAt = reducedMotion.matches ? 0 : panelAt + 240;
  winTimers.push(
    setTimeout(() => {
      $('controls').hidden = true;
      $('win').hidden = false;
      (next.hidden ? $('win-list') : next).focus({ preventScroll: true });
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
$('win-list').addEventListener('click', () => go(null));
$('win-next').addEventListener('click', (e) => {
  const [size, index] = e.currentTarget.dataset.target.split('-').map(Number);
  go({ size, index });
});

// 視窗跨過桌面寬度時，規則跟著展開（桌面沒有收合開關）
desktop.addEventListener('change', () => {
  if (desktop.matches) $('rules').open = true;
});

// 已破關卡重玩：存檔盤面已在破關時清除，因此會從空盤面開始。
window.addEventListener('hashchange', route);
route();
