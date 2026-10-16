// 隨機出題：同一個尺寸＋種子永遠產生同一題，網址帶著種子就能重現、分享。
import { countSolutions } from './solver.js';

const LETTERS = 'ABCDEFGHIJ';

/** mulberry32：小而快的可重現亂數，回傳 [0, 1) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

function shuffle(rand, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** 每列一隻、欄不重複、上下列不相鄰的隨機擺法（回傳每列的欄） */
function placeQueens(rand, size) {
  const cols = [];
  const used = new Array(size).fill(false);
  const place = (row) => {
    if (row === size) return true;
    for (const col of shuffle(rand, [...Array(size).keys()])) {
      if (used[col] || (row > 0 && Math.abs(cols[row - 1] - col) <= 1)) continue;
      used[col] = true;
      cols.push(col);
      if (place(row + 1)) return true;
      cols.pop();
      used[col] = false;
    }
    return false;
  };
  place(0);
  return cols;
}

function neighbors(size, i) {
  const r = Math.floor(i / size), c = i % size;
  const out = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
}

/** 從每隻刺蝟所在的格子開始，隨機一格一格往外長，直到填滿盤面 */
function growRegions(rand, size, queens) {
  const regions = new Array(size * size).fill(-1);
  queens.forEach((col, row) => (regions[row * size + col] = row));
  let left = size * size - size;
  while (left > 0) {
    // 隨機挑一個空格，接到旁邊某個已經長出來的色塊
    const frontier = [];
    regions.forEach((r, i) => {
      if (r === -1 && neighbors(size, i).some((j) => regions[j] !== -1)) frontier.push(i);
    });
    const i = pick(rand, frontier);
    regions[i] = regions[pick(rand, neighbors(size, i).filter((j) => regions[j] !== -1))];
    left--;
  }
  return regions;
}

/** 拿掉 i 之後，色塊 id 的其他格子是否還連在一起 */
function staysConnected(size, regions, id, i) {
  const cells = [];
  regions.forEach((r, j) => r === id && j !== i && cells.push(j));
  if (cells.length === 0) return false;
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    for (const j of neighbors(size, stack.pop())) {
      if (j !== i && regions[j] === id && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

/** 回傳一個和 answer 不同的解（每列的欄），沒有就回傳 null */
function otherSolution(puzzle, answer) {
  const { size, regions } = puzzle;
  const usedCols = new Array(size).fill(false);
  const usedRegions = new Array(size).fill(false);
  const cols = [];
  const place = (row) => {
    if (row === size) return cols.some((c, r) => c !== answer[r]);
    for (let col = 0; col < size; col++) {
      const region = regions[row * size + col];
      if (usedCols[col] || usedRegions[region]) continue;
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      usedCols[col] = usedRegions[region] = true;
      cols.push(col);
      if (place(row + 1)) return true;
      cols.pop();
      usedCols[col] = usedRegions[region] = false;
    }
    return false;
  };
  return place(0) ? [...cols] : null;
}

/**
 * 修到唯一解：找出另一個解，把它用到、但不是答案的某一格，改劃給旁邊的色塊，
 * 讓那個解不再成立；答案的刺蝟格不動，色塊保持連通。修太多次仍不行就放棄這一盤。
 */
function makeUnique(rand, size, regions, answer, maxSteps) {
  const isAnswer = new Set(answer.map((col, row) => row * size + col));
  for (let step = 0; step < maxSteps; step++) {
    const other = otherSolution({ size, regions }, answer);
    if (!other) return true;
    const moves = [];
    other.forEach((col, row) => {
      const i = row * size + col;
      if (isAnswer.has(i)) return;
      for (const j of neighbors(size, i)) {
        if (regions[j] !== regions[i] && staysConnected(size, regions, regions[i], i)) moves.push([i, regions[j]]);
      }
    });
    if (moves.length === 0) return false;
    const [i, to] = pick(rand, moves);
    regions[i] = to;
  }
  return false;
}

/** 每列由左而右、第一次出現的色塊依序叫 A、B、C…，同一題不會因為編號不同而看起來像兩題 */
function toRows(size, regions) {
  const names = new Map();
  const rows = [];
  for (let r = 0; r < size; r++) {
    let row = '';
    for (let c = 0; c < size; c++) {
      const id = regions[r * size + c];
      if (!names.has(id)) names.set(id, LETTERS[names.size]);
      row += names.get(id);
    }
    rows.push(row);
  }
  return rows;
}

/** 產生一題唯一解、色塊連通的 size×size 題目，回傳和題庫一樣的字串陣列 */
export function generate(size, seed) {
  const rand = rng(seed);
  for (;;) {
    const answer = placeQueens(rand, size);
    const regions = growRegions(rand, size, answer);
    if (makeUnique(rand, size, regions, answer, size * size)) return toRows(size, regions);
  }
}

/** 隨機種子：用在網址上，base36 比較短 */
export const newSeed = () => Math.floor(Math.random() * 2 ** 32);

