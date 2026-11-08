import { parsePuzzle, findConflicts, EMPTY, MARK, QUEEN } from './rules.js';
import { PUZZLES } from './puzzles.js';
import { PICTURES, GRID, BOOKS } from './pictures.js';
import * as album from './album.js';
import { tabs, piecePath, hashSeed, UNIT } from './jigsaw.js';
import { newSeed } from './generator.js';
import * as storage from './storage.js';
import * as sound from './sound.js';
import * as music from './music.js';
import { targets } from './tutorial.js';
import { TIPS, cellsOf } from './tips.js';
import * as play from './session.js';
import { levelId, randomId, solvedIn, startedIn } from './session.js';

const $ = (id) => document.getElementById(id);

// 聲音設定的紙卡用 popover；舊瀏覽器沒有，連 :popover-open 這個選擇器都會丟例外，所以先問清楚
const POPOVER = 'popover' in HTMLElement.prototype;

function closeAudioMenu() {
  const menu = $('audio-menu');
  if (POPOVER ? !menu.matches(':popover-open') : menu.hidden) return;
  if (POPOVER) return menu.hidePopover();
  menu.hidden = true;
  placeAudioMenu(false);
}

// 拼圖冊小圖右上角的狀態圖示：同一套線條粗細
const CHECK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const LOCK_SVG =
  '<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

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

// 正在玩的那一局（src/session.js）：拼圖的一片、隨機題或教學；不在遊戲頁時為 null
let session = null;
let cells = [];
let shown = []; // 每格目前畫在紙上的狀態，只有變了才重畫
let winTimers = [];

// 規則並排在棋盤右方的桌機版面，條件和 style.css 一致
const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- 路由：網址要打開什麼由 src/session.js 的 resolve() 決定 ----------

// 已經在這個網站裡換過畫面：技巧頁的「返回」才能放心用瀏覽器上一頁
let routed = false;
let tipsFromApp = false;

function route() {
  const wasRouted = routed;
  routed = true;
  const to = play.resolve(location.hash);
  if (to.view === 'tips') return openTips(wasRouted);
  if (to.view === 'game') return openGame(to.target);
  if (to.invalid) history.replaceState(null, '', location.pathname);
  showLevels(to.tab);
}

function go(target) {
  location.hash = target === null ? '' : levelId(target.size, target.index);
}

/** 回列表：從隨機題回來就回到「隨機難度」那一頁 */
const goList = () => (location.hash = session?.kind === 'random' ? 'random' : '');

// ---------- 拼圖冊：上面選尺寸，中間是目前這一幅，下面是這一本的每一幅 ----------

// 列表上翻到的那一本（尺寸）、那一幅；這次瀏覽中記著，從題目回來時翻到剛剛那一幅
const shelf = { size: null, picture: null };
// 剛拼上的那一片：回到列表時從下面飛進位置
let landing = null;

const imageOf = (pic, small = false) => `pictures/${pic.id}${small ? '-s' : ''}.webp`;
// 每一幅的凸耳由它的 id 決定，畫過就記著
const shapes = new Map();
function shapeOf(size, pic) {
  if (!shapes.has(pic.id)) shapes.set(pic.id, tabs(GRID[size], hashSeed(pic.id)));
  return shapes.get(pic.id);
}

/** 三個畫面一次只顯示一個 */
function showView(id) {
  for (const view of ['levels-view', 'game-view', 'tips-view']) $(view).hidden = view !== id;
  // 換頁時收起聲音設定；離開遊戲頁就不會在標記中
  closeAudioMenu();
  if (id !== 'game-view') music.setTrial(false);
}

function showLevels(tab = 'levels') {
  const from = session?.kind === 'level' ? session.target : null;
  const fromRandom = session?.kind === 'random' ? session.target : null;
  session = null;
  clearWin();
  showView('levels-view');
  for (const name of ['levels', 'random']) {
    $(`tab-${name}`).setAttribute('aria-selected', name === tab);
    $(`tab-${name}`).tabIndex = name === tab ? 0 : -1;
    $(`panel-${name}`).hidden = name !== tab;
  }

  if (from) Object.assign(shelf, { size: from.size, picture: album.locate(from.size, from.index).picture });
  buildAlbum();
  buildRandom();

  // 從隨機題回來：那一張尺寸卡不在畫面上就捲過去
  if (fromRandom) {
    const card = $('random-list').querySelector(`[data-size="${fromRandom.size}"]`);
    const { top, bottom } = card.getBoundingClientRect();
    if (top < 0 || bottom > innerHeight) card.scrollIntoView({ block: 'center' });
  }

  // 從題目回來：拼圖不在畫面上就捲過去，看那一片落進位置
  if (from) {
    const target = $('album').querySelector('.jigsaw');
    const { top, bottom } = target.getBoundingClientRect();
    if (top < 0 || bottom > innerHeight) target.scrollIntoView({ block: 'center' });
  }
}

/** 拼圖冊：每次回到列表、換尺寸、換一幅都整個重畫 */
function buildAlbum() {
  const all = storage.getSolved();
  const boards = storage.getBoards();
  const sizes = Object.keys(PICTURES).map(Number);
  // 第一次打開：翻到最小一本還沒拼完的
  shelf.size ??= sizes.find((s) => !album.albumComplete(s, solvedIn(s, all))) ?? sizes[0];
  const size = shelf.size;
  const solved = solvedIn(size, all);
  const started = startedIn(size, boards);
  if (shelf.picture === null || !album.isOpen(size, shelf.picture, solved, started)) {
    shelf.picture = album.currentPicture(size, solved, started);
  }
  const picture = shelf.picture;
  const pic = PICTURES[size][picture];
  const per = album.piecesOf(size);
  const got = album.progress(size, picture, solved);
  const complete = got === per;

  // 四本拼圖冊：選中的那本貼在頁面上，其他是印上去的虛線框
  const sizeRow = document.createElement('div');
  sizeRow.className = 'album-sizes';
  sizeRow.setAttribute('role', 'group');
  sizeRow.setAttribute('aria-label', '拼圖冊');
  for (const s of sizes) {
    const doneCount = PICTURES[s].filter((_, p) => album.isComplete(s, p, solvedIn(s, all))).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'album-size';
    btn.setAttribute('aria-pressed', s === size);
    btn.innerHTML = `<span>${s}×${s}</span><small>${doneCount} / ${PICTURES[s].length} 幅</small>`;
    btn.setAttribute('aria-label', `${s}×${s}，拼好 ${doneCount} / ${PICTURES[s].length} 幅`);
    btn.addEventListener('click', () => {
      if (s === shelf.size) return;
      Object.assign(shelf, { size: s, picture: null });
      buildAlbum();
    });
    sizeRow.append(btn);
  }

  const head = document.createElement('div');
  head.className = 'album-head';
  head.innerHTML = `<h2><span></span></h2><span class="count">${complete ? '拼好了' : `已拼 ${got} / ${per}`}</span>`;
  head.querySelector('h2 span').textContent = pic.title;

  const jig = jigsawEl(size, picture, solved, started);

  const book = BOOKS[pic.book];
  const credit = document.createElement('p');
  credit.className = 'album-credit';
  credit.textContent = `插圖：${book.artist}，${book.year}`;

  const parts = [sizeRow, head, jig, credit];
  // 還沒拼完：主要按鈕替你挑一片；拼完了而後面還有沒拼完的：翻到那一幅
  const nextOpen = album.currentPicture(size, solved, started);
  if (!complete) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn primary album-next';
    btn.innerHTML = `${hedgehogSvg()}<span>拼下一片</span>`;
    btn.addEventListener('click', () => go({ size, index: album.nextPiece(size, picture, solved, started) }));
    parts.push(btn);
  } else if (!album.isComplete(size, nextOpen, solved)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn primary album-next';
    btn.textContent = `下一幅：${PICTURES[size][nextOpen].title}`;
    btn.addEventListener('click', () => {
      shelf.picture = nextOpen;
      buildAlbum();
    });
    parts.push(btn);
  }
  parts.push(shelfEl(size, picture, solved, started));
  $('album').replaceChildren(...parts);
  landing = null;
}

/** 一整幅拼圖：插圖墊在底下，還沒拼的片蓋一張紙、畫上虛線輪廓；上面疊一層透明按鈕，一片一顆 */
function jigsawEl(size, picture, solved, started) {
  const pic = PICTURES[size][picture];
  const n = GRID[size];
  const t = shapeOf(size, pic);
  const W = n * UNIT;
  const land = landing?.size === size ? pic.levels.indexOf(landing.index) : -1;
  // 插圖沒抓到（例如離線又沒存過）時，拼好的片就是一張白紙，照樣能玩
  const image = `<image href="${imageOf(pic)}" width="${W}" height="${W}" preserveAspectRatio="xMidYMid slice"/>`;

  let svg =
    `<svg viewBox="-6 -6 ${W + 12} ${W + 12}" aria-hidden="true"><defs>` +
    `<clipPath id="jig-clip"><rect width="${W}" height="${W}" rx="12"/></clipPath>` +
    (land >= 0 ? `<clipPath id="jig-land"><path d="${piecePath(n, t, land)}"/></clipPath>` : '') +
    `</defs><g clip-path="url(#jig-clip)"><rect class="paper" width="${W}" height="${W}"/>${image}`;
  pic.levels.forEach((index, slot) => {
    if (solved.has(index) && slot !== land) return;
    const cx = (slot % n) * UNIT + UNIT / 2;
    const cy = Math.floor(slot / n) * UNIT + UNIT / 2;
    svg += `<path class="slot" d="${piecePath(n, t, slot)}"/>`;
    if (slot === land) return;
    svg += `<text class="num" x="${cx}" y="${cy + 10}">${slot + 1}</text>`;
    if (started.has(index)) svg += `<circle class="dot" cx="${cx}" cy="${cy + 30}" r="5"/>`;
  });
  pic.levels.forEach((index, slot) => {
    if (solved.has(index) && slot !== land) svg += `<path class="seam" d="${piecePath(n, t, slot)}"/>`;
  });
  if (land >= 0) {
    const d = piecePath(n, t, land);
    svg +=
      `<g class="landing"><g clip-path="url(#jig-land)">${image}</g><path class="seam" d="${d}"/></g>` +
      `<path class="glow" d="${d}"/>`;
  }
  svg += `</g><rect class="frame" width="${W}" height="${W}" rx="12"/></svg>`;

  const wrap = document.createElement('div');
  wrap.className = 'jigsaw';
  wrap.style.setProperty('--num', `${{ 3: 28, 4: 25 }[n] ?? 22}px`);
  wrap.innerHTML = svg;
  const hit = document.createElement('div');
  hit.className = 'hit';
  hit.style.setProperty('--g', n);
  pic.levels.forEach((index, slot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const done = solved.has(index);
    const going = !done && started.has(index);
    btn.setAttribute('aria-label', `${pic.title} 第 ${slot + 1} 片${done ? '，拼好了' : going ? '，玩到一半' : ''}`);
    btn.addEventListener('click', () => go({ size, index }));
    hit.append(btn);
  });
  wrap.append(hit);
  // 一幅拼完：頁邊蓋一枚「拼好了」；剛拼完的那一下才有蓋章動畫
  if (album.isComplete(size, picture, solved)) {
    wrap.insertAdjacentHTML(
      'beforeend',
      `<div class="seal album-seal${land >= 0 ? ' fresh' : ''}" aria-hidden="true"><span>拼好了</span></div>`,
    );
  }
  return wrap;
}

/** 這一本的每一幅：拼好的貼上插圖、打開的淡淡印著、還沒打開的是虛線空框 */
function shelfEl(size, current, solved, started) {
  const list = PICTURES[size];
  const per = album.piecesOf(size);
  const doneCount = list.filter((_, p) => album.isComplete(size, p, solved)).length;
  const section = document.createElement('section');
  section.className = 'shelf';
  section.innerHTML = `<h3>這一本的拼圖<span>拼好 ${doneCount} / ${list.length} 幅</span></h3>`;
  const ol = document.createElement('ol');
  list.forEach((pic, p) => {
    const open = album.isOpen(size, p, solved, started);
    const done = album.isComplete(size, p, solved);
    const got = album.progress(size, p, solved);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.classList.toggle('partial', open && !done);
    btn.disabled = !open;
    if (p === current) btn.setAttribute('aria-current', 'true');
    btn.innerHTML = !open
      ? LOCK_SVG
      : done
        ? `<img src="${imageOf(pic, true)}" alt="" loading="lazy">${CHECK_SVG}`
        : `${thumbSvg(size, p, solved)}<span class="meter">${got}/${per}</span>`;
    btn.setAttribute('aria-label', open ? `${pic.title}，${done ? '拼好了' : `已拼 ${got} / ${per}`}` : `第 ${p + 1} 幅，還沒打開`);
    btn.addEventListener('click', () => {
      shelf.picture = p;
      buildAlbum();
    });
    li.append(btn);
    ol.append(li);
  });
  section.append(ol);
  return section;
}

/** 沒拼完的那一幅的小圖：只露出拼好的那幾片，其他留白，和大拼圖一樣要拼了才看得到 */
function thumbSvg(size, picture, solved) {
  const pic = PICTURES[size][picture];
  const n = GRID[size];
  const t = shapeOf(size, pic);
  const W = n * UNIT;
  const pieces = pic.levels.flatMap((index, slot) => (solved.has(index) ? [`<path d="${piecePath(n, t, slot)}"/>`] : []));
  const id = `thumb-${pic.id}`;
  return (
    `<svg viewBox="0 0 ${W} ${W}" aria-hidden="true">` +
    (pieces.length
      ? `<defs><clipPath id="${id}">${pieces.join('')}</clipPath></defs>` +
        `<image href="${imageOf(pic, true)}" width="${W}" height="${W}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
      : '') +
    `</svg>`
  );
}

/** 過關面板上剛拿到的那一片：插圖照這一片的形狀剪下來 */
function pieceSvg(size, picture, slot) {
  const pic = PICTURES[size][picture];
  const n = GRID[size];
  const d = piecePath(n, shapeOf(size, pic), slot);
  const x = (slot % n) * UNIT - 32;
  const y = Math.floor(slot / n) * UNIT - 32;
  const W = n * UNIT;
  return (
    `<svg viewBox="${x} ${y} 164 164"><defs><clipPath id="win-clip"><path d="${d}"/></clipPath></defs>` +
    `<g clip-path="url(#win-clip)"><rect class="paper" x="${x}" y="${y}" width="164" height="164"/>` +
    `<image href="${imageOf(pic)}" width="${W}" height="${W}" preserveAspectRatio="xMidYMid slice"/></g>` +
    `<path class="edge" d="${d}"/></svg>`
  );
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

/** 打開一局：拼圖的一片、隨機題、教學都是同一張棋盤、同一套操作；教學的棋盤上方多一行引導 */
function openGame(target) {
  session = play.open(target);
  landing = null;
  showGame(session.title, session.kicker);
  if (session.hint) coach(session.hint.text);
  buildBoard(session.game.puzzle);
  // 回到存檔的盤面：墨跡本來就在紙上，不重寫一次
  render(new Set(), { instant: true });
}

/** 桌面規則一律展開；手機照自己上次的選擇，沒動過就只在還沒破過任何一題（固定或隨機）時展開 */
function rulesOpen() {
  if (desktop.matches) return true;
  const chosen = storage.getRulesOpen();
  if (chosen !== null) return chosen;
  return storage.getSolved().size === 0 && Object.keys(storage.getRandomSolved()).length === 0;
}

function showGame(title, kicker = '') {
  showView('game-view');
  clearWin();
  // 從列表下方點進來、或在過關後按下一片，都從頁頂的標題和棋盤開始
  scrollTo(0, 0);
  $('level-title').textContent = title;
  if (kicker) {
    const small = document.createElement('small');
    small.textContent = kicker;
    $('level-title').prepend(small);
  }
  const lesson = session.kind === 'lesson', random = session.kind === 'random';
  $('game-view').classList.toggle('lesson', lesson);
  // 教學本身就在教規則，規則欄先收起來，畫面只留引導和棋盤
  $('rules').hidden = lesson;
  $('rules').open = rulesOpen();
  $('coach').hidden = !lesson;
  // 隨機題才有「換一題」
  $('shuffle').hidden = !random;
  $('controls').classList.toggle('four', random);
}

/** 換成這一步的引導；文字沒變就不動，免得報讀器重念 */
function coach(text) {
  const el = $('coach');
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
  session = null;
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

function render(preview = new Set(), { instant = false, erasing = false } = {}) {
  const { game } = session;
  const conflicts = findConflicts(game.puzzle, game.board);
  // 教學中這一步要玩家動的格子會亮起；過關後就不再提示
  const step = session.hint;
  const lit = new Set(step ? targets(step, game.board) : []);
  // 標記中畫的格子用虛線；拖曳經過、還沒放開的空格也算（擦 ✕ 的拖曳則是經過的 ✕ 先擦掉）
  const tentative = game.tentative;
  const changed = [];
  game.board.forEach((state, i) => {
    const drawn = preview.has(i) && state === (erasing ? MARK : EMPTY);
    const next = drawn ? (erasing ? EMPTY : MARK) : state;
    if (drawn && game.trying) tentative.add(i);
    cells[i].classList.toggle('queen', next === QUEEN);
    cells[i].classList.toggle('mark', next === MARK);
    cells[i].classList.toggle('conflict', conflicts.has(i));
    cells[i].classList.toggle('target', lit.has(i));
    if (next !== shown[i]) changed.push([i, next]);
  });
  $('board').classList.toggle('trying', game.trying);
  $('trial-tag').hidden = !game.trying;
  music.setTrial(game.trying);

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

/** 盤面動過之後：存檔和過關判斷交給 session，這裡負責出聲、重畫、換上過關面板 */
function afterChange() {
  const { conflict, win } = session.move();
  // 放下去會刺到別人：「啵」之後接一聲「咚」
  if (conflict) sound.play('conflict');
  // 問著「確定要換嗎？」時又去動盤面，就當作不換了
  if (session.kind === 'random') ask(false);
  // 回到列表時，剛拼上的那一片從下面飛進拼圖裡
  if (win?.landed) landing = win.landed;
  render();
  if (win) showWin(win);
  else if (session.hint) coach(session.hint.text);
}

// 過關的節奏：刺蝟由上而下依序蓋印 → 操作列換成過關面板 → 頁邊蓋上「過關」章。
// 盤面一直留在畫面上，玩家可以看著自己解開的那一頁。
// 內容由 session 的 move() 給（見 src/session.js 的 levelWin）
function showWin({ title, seal, next: target, list, piece: got, note = '' }) {
  // 拼圖的過關：面板左邊是剛拿到的那一片
  const piece = got ? pieceSvg(got.size, got.picture, got.slot) : '';
  const board = $('board');
  board.classList.add('locked', 'solved');
  const queens = cells.filter((cell) => cell.classList.contains('queen'));
  queens.forEach((cell, order) => cell.style.setProperty('--order', order));

  // 一般過關只留頁邊的紅印章；綠字標題只在有額外的話要說時（全部完成、學會了）才出現
  const quiet = title === '過關！';
  $('win').classList.toggle('quiet', quiet);
  $('win-title').textContent = title;
  $('seal').firstElementChild.textContent = seal;
  $('win-list').textContent = list;
  // 剛拿到的那一片旁邊一行寫拼到第幾片
  $('win').classList.toggle('with-piece', piece !== '');
  $('win-piece').innerHTML = piece;
  $('win-piece').hidden = piece === '';
  $('win-note').textContent = note;
  $('win-note').hidden = note === '';
  const next = $('win-next');
  next.hidden = !target;
  if (target) {
    next.textContent = target.label;
    next.dataset.target = target.hash;
  }

  const panelAt = reducedMotion.matches ? 0 : queens.length * 90 + 180;
  const stampAt = reducedMotion.matches ? 0 : panelAt + 240;
  // 刺蝟跳一隻響一個音，印章壓到紙上（stamp 動畫的 60%）時「咚」；沒有動畫時音階一口氣跑完再蓋章。
  // 背景音樂先讓位，音階從音樂當下的和弦起跳，蓋章後停一小節再重新淡入
  const stampSound = reducedMotion.matches ? queens.length * 0.05 + 0.15 : (stampAt + 250) / 1000;
  sound.play('cheer', music.cheerNotes(queens.length), reducedMotion.matches ? 0.05 : 0.09);
  sound.play('stamp', stampSound);
  music.win(stampSound);
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

// ---------- 指標操作：點擊循環、拖曳標 ✕、從 ✕ 開始拖曳擦 ✕（滑鼠與觸控共用） ----------

let drag = null;

/** 還能下棋的那一盤：不在遊戲頁或已經過關則為 null */
const playing = () => (session && !session.game.solved ? session.game : null);

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
  const game = playing();
  if (!game || e.button !== 0) return;
  const start = cellAt(e.clientX, e.clientY);
  if (start === null) return;
  e.preventDefault();
  $('board').setPointerCapture(e.pointerId);
  cells[start].classList.add('pressed');
  // 起點是 ✕ 的拖曳整趟都是擦 ✕；只點一下不拖還是照常循環
  drag = { start, cells: new Set([start]), moved: false, erasing: game.board[start] === MARK };
});

$('board').addEventListener('pointermove', (e) => {
  if (!drag) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i === null || drag.cells.has(i)) return;
  const { game } = session;
  drag.cells.add(i);
  // 拖曳經過空格時劃一筆；擦 ✕ 時經過 ✕ 擦一下
  const [target, effect] = drag.erasing ? [MARK, 'erase'] : [EMPTY, 'mark'];
  if (game.board[i] === target || (!drag.moved && game.board[drag.start] === target)) sound.play(effect, 1);
  drag.moved = true;
  render(drag.cells, { erasing: drag.erasing });
});

$('board').addEventListener('pointerup', () => {
  if (!drag) return;
  const { start, cells: touched, moved, erasing } = drag;
  const { game } = session;
  drag = null;
  cells[start].classList.remove('pressed');
  if (moved ? (erasing ? game.unmark(touched) : game.mark(touched)) : game.cycle(start)) {
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
  if (playing()?.undo()) {
    sound.play('undo');
    afterChange();
  }
});

$('reset').addEventListener('click', () => {
  if (playing()?.reset()) {
    sound.play('reset');
    afterChange();
  }
});

// 標記：之後畫的都是試放（虛線），再決定留下或擦掉
$('trial').addEventListener('click', () => {
  if (playing()?.startTrial()) afterChange();
});

$('keep').addEventListener('click', () => {
  const game = playing();
  if (!game) return;
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
  if (playing()?.erase()) {
    sound.play('erase');
    afterChange();
  }
});

// 換一題：同尺寸抽新種子，這一盤放掉；用 replace 不留歷史，按返回不會回到被換掉的那題
function shuffle() {
  if (session?.kind !== 'random' || !playing()) return;
  location.replace(`#${session.shuffle()}`);
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
  if (session?.game.board.every((v) => v === EMPTY)) shuffle();
  else ask(true);
});
$('ask-yes').addEventListener('click', shuffle);
$('ask-no').addEventListener('click', () => ask(false));

$('back').addEventListener('click', goList);
$('learn').addEventListener('click', () => (location.hash = 'learn'));
$('tips').addEventListener('click', () => (location.hash = 'tips'));
// 從列表或題目點進來的回到原本那一頁；直接開技巧頁網址的，回列表
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

// 視窗跨過桌面寬度時，規則跟著展開（桌面沒有收合開關）；縮回來就照手機的選擇
desktop.addEventListener('change', () => {
  $('rules').open = rulesOpen();
});

// 聲音設定：三個頁面的喇叭鍵共用一張小紙卡，音效、音樂分開開關，都預設打開。
// 兩個都關掉時喇叭才打 ✕
const SPEAKER_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>' +
  '<path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
const speakers = document.querySelectorAll('.sound');
speakers.forEach((el) => (el.innerHTML = SPEAKER_SVG));

function showAudio() {
  const sfx = storage.getSound(), bgm = storage.getMusic();
  $('sfx-switch').setAttribute('aria-checked', sfx);
  $('music-switch').setAttribute('aria-checked', bgm);
  speakers.forEach((el) => el.classList.toggle('muted', !sfx && !bgm));
}
sound.setEnabled(storage.getSound());
music.setEnabled(storage.getMusic());
showAudio();

// 打開音效時「啵」一聲當作確認；打開音樂時從頭淡入
$('sfx-switch').addEventListener('click', () => {
  const on = !storage.getSound();
  storage.setSound(on);
  sound.setEnabled(on);
  showAudio();
  sound.play('queen');
});
$('music-switch').addEventListener('click', () => {
  const on = !storage.getMusic();
  storage.setMusic(on);
  music.setEnabled(on);
  music.wake();
  showAudio();
});

// 紙卡掉在目前這一頁的喇叭正下方，右緣對齊；捲動時就收起來，不留在半空中
function placeAudioMenu(open) {
  speakers.forEach((el) => el.classList.remove('open'));
  if (!open) return;
  const speaker = document.querySelector('main:not([hidden]) .sound');
  speaker.classList.add('open');
  const { bottom, right } = speaker.getBoundingClientRect();
  $('audio-menu').style.top = `${bottom + 4}px`;
  $('audio-menu').style.right = `${document.documentElement.clientWidth - right}px`;
}
if (POPOVER) {
  $('audio-menu').addEventListener('beforetoggle', (e) => placeAudioMenu(e.newState === 'open'));
} else {
  // 不支援 popover 的瀏覽器（例如 iOS 16）：自己開合，點外面或按 Esc 收起
  $('audio-menu').hidden = true;
  $('audio-menu').classList.add('fallback');
  speakers.forEach((el) =>
    el.addEventListener('click', () => {
      const open = $('audio-menu').hidden;
      $('audio-menu').hidden = !open;
      placeAudioMenu(open);
    }),
  );
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#audio-menu, .sound')) closeAudioMenu();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAudioMenu());
}
addEventListener('scroll', closeAudioMenu, { passive: true });

// 瀏覽器只在使用者手勢當下准許出聲：重新載入後，第一次碰畫面就把聲音喚醒、音樂開始淡入
function wakeAudio() {
  sound.unlock();
  music.wake();
}
for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  document.addEventListener(type, wakeAudio, { capture: true, passive: true });
}
// 切到背景時音樂淡出、AudioContext 暫停；回來再淡入（瀏覽器不准的話，等下一次碰畫面）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return wakeAudio();
  music.stop(0.3);
  setTimeout(() => document.hidden && sound.sleep(), 400);
});

// 刊頭、教學卡、規則裡的刺蝟都是同一隻
document.querySelectorAll('span.hedgehog').forEach((el) => (el.innerHTML = hedgehogSvg()));

// 刊頭的刺蝟：戳一下會跳起來
$('mascot').addEventListener('click', (e) => {
  const el = e.currentTarget;
  el.classList.remove('hop');
  void el.offsetWidth;
  el.classList.add('hop');
});

// 拼好的片重玩：存檔盤面已在破關時清除，因此會從空盤面開始。
window.addEventListener('hashchange', route);
route();

// 離線遊玩：service worker 把整個遊戲存起來（file:// 或不支援的瀏覽器就略過）
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
