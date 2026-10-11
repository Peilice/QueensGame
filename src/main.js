import { parsePuzzle, findConflicts, MARK, QUEEN } from './rules.js';
import { Game, isUnlocked } from './game.js';
import { PUZZLES } from './puzzles.js';
import * as storage from './storage.js';

const $ = (id) => document.getElementById(id);

const QUEEN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5z"/><rect x="5" y="20" width="14" height="2" rx="1"/></svg>';
const MARK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';

let level = null;
let game = null;
let cells = [];

// ---------- 路由：#3 代表第 3 關，空白代表關卡列表 ----------

function route() {
  const n = Number(location.hash.slice(1));
  const index = n - 1;
  if (Number.isInteger(n) && index >= 0 && index < PUZZLES.length && isUnlocked(index, storage.getSolved())) {
    openLevel(index);
  } else {
    if (location.hash) history.replaceState(null, '', location.pathname);
    showLevels();
  }
}

function go(index) {
  location.hash = index === null ? '' : String(index + 1);
}

// ---------- 關卡列表 ----------

function showLevels() {
  level = game = null;
  $('win').hidden = true;
  $('game-view').hidden = true;
  $('levels-view').hidden = false;

  const solved = storage.getSolved();
  const list = $('level-list');
  list.replaceChildren(
    ...PUZZLES.map((rows, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level';
      const unlocked = isUnlocked(i, solved);
      btn.disabled = !unlocked;
      if (solved.has(i)) btn.classList.add('solved');
      btn.innerHTML = `<span class="num">${i + 1}</span><span class="size">${rows.length}×${rows.length}</span>`;
      btn.setAttribute(
        'aria-label',
        `第 ${i + 1} 關，${rows.length}×${rows.length}${solved.has(i) ? '，已完成' : unlocked ? '' : '，未解鎖'}`,
      );
      btn.addEventListener('click', () => go(i));
      li.append(btn);
      return li;
    }),
  );
}

// ---------- 遊戲畫面 ----------

function openLevel(index) {
  level = index;
  const puzzle = parsePuzzle(PUZZLES[index]);
  game = new Game(puzzle, storage.getBoard(index));

  $('levels-view').hidden = true;
  $('game-view').hidden = false;
  $('win').hidden = true;
  $('level-title').textContent = `第 ${index + 1} 關`;

  buildBoard(puzzle);
  render();
}

function buildBoard({ size, regions }) {
  const board = $('board');
  board.style.setProperty('--n', size);
  board.classList.remove('locked');
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
}

function render(preview = new Set()) {
  const conflicts = findConflicts(game.puzzle, game.board);
  game.board.forEach((state, i) => {
    const cell = cells[i];
    const shown = state === 0 && preview.has(i) ? MARK : state;
    cell.innerHTML = shown === QUEEN ? QUEEN_SVG : shown === MARK ? MARK_SVG : '';
    cell.classList.toggle('queen', shown === QUEEN);
    cell.classList.toggle('mark', shown === MARK);
    cell.classList.toggle('conflict', conflicts.has(i));
  });
  $('undo').disabled = game.solved || !game.canUndo;
  $('reset').disabled = game.solved;
}

function afterChange() {
  if (game.solved) {
    storage.markSolved(level);
    render();
    showWin();
  } else {
    storage.saveBoard(level, game.board);
    render();
  }
}

function showWin() {
  $('board').classList.add('locked');
  const last = level === PUZZLES.length - 1;
  $('win-title').textContent = last ? '全部完成！' : '過關！';
  $('win-next').hidden = last;
  $('win').hidden = false;
  (last ? $('win-list') : $('win-next')).focus();
}

// ---------- 指標操作：點擊循環、拖曳標 ✕（滑鼠與觸控共用） ----------

let drag = null;

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.cell');
  return el && el.parentElement === $('board') ? Number(el.dataset.index) : null;
}

$('board').addEventListener('pointerdown', (e) => {
  if (!game || game.solved || !e.isPrimary || e.button !== 0) return;
  const start = cellAt(e.clientX, e.clientY);
  if (start === null) return;
  e.preventDefault();
  $('board').setPointerCapture(e.pointerId);
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
  if (moved ? game.mark(touched) : game.cycle(start)) afterChange();
  else render();
});

$('board').addEventListener('pointercancel', () => {
  drag = null;
  render();
});

// ---------- 按鈕 ----------

$('undo').addEventListener('click', () => {
  if (game && !game.solved && game.undo()) afterChange();
});

$('reset').addEventListener('click', () => {
  if (game && !game.solved && game.reset()) afterChange();
});

$('back').addEventListener('click', () => go(null));
$('win-list').addEventListener('click', () => go(null));
$('win-next').addEventListener('click', () => go(level + 1));

// 已破關卡重玩：存檔盤面已在破關時清除，因此會從空盤面開始。
window.addEventListener('hashchange', route);
route();
