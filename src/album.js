// 拼圖冊的規則：哪一幅打開了、拼到哪裡、下一片拼哪一片。
// solved、started 都是「這個尺寸」的題目編號集合（從 0 算）：破過的題、存著盤面玩到一半的題。
import { PICTURES, GRID } from './pictures.js';

/** 這個尺寸一幅幾片 */
export const piecesOf = (size) => GRID[size] ** 2;

// 題目編號 → 在哪一幅的第幾片
const WHERE = Object.fromEntries(
  Object.entries(PICTURES).map(([size, list]) => {
    const map = new Map();
    list.forEach((p, picture) => p.levels.forEach((index, slot) => map.set(index, { picture, slot })));
    return [size, map];
  }),
);

/** 第 index 題在哪一幅的第幾片；不在任何一幅裡（不該發生）回傳 null */
export function locate(size, index) {
  return WHERE[size]?.get(index) ?? null;
}

/** 一幅拼好了幾片 */
export function progress(size, picture, solved) {
  return PICTURES[size][picture].levels.filter((i) => solved.has(i)).length;
}

export function isComplete(size, picture, solved) {
  return progress(size, picture, solved) === piecesOf(size);
}

/**
 * 一次開一幅：第一幅一開始就打開，拼完一幅才打開下一幅。
 * 改版前破過的題、玩到一半的盤面可能落在後面幾幅：那幾幅也算打開，存檔才不會被鎖在裡面。
 */
export function isOpen(size, picture, solved, started) {
  if (picture === 0 || isComplete(size, picture - 1, solved)) return true;
  return PICTURES[size][picture].levels.some((i) => solved.has(i) || started.has(i));
}

/** 這一題現在能不能玩：它所在的那一幅打開了沒 */
export function canPlay(size, index, solved, started) {
  const at = locate(size, index);
  return at !== null && isOpen(size, at.picture, solved, started);
}

/** 列表上預設翻到的那一幅：最前面一幅打開了但還沒拼完的；全部拼完就是最後一幅 */
export function currentPicture(size, solved, started) {
  const list = PICTURES[size];
  const at = list.findIndex((_, p) => isOpen(size, p, solved, started) && !isComplete(size, p, solved));
  return at >= 0 ? at : list.length - 1;
}

/** 這一幅裡隨便挑一片還沒拼的（玩到一半的優先接著玩）；拼完了回傳 null */
export function nextPiece(size, picture, solved, started, random = Math.random) {
  const left = PICTURES[size][picture].levels.filter((i) => !solved.has(i));
  if (!left.length) return null;
  const going = left.filter((i) => started.has(i));
  const pool = going.length ? going : left;
  return pool[Math.floor(random() * pool.length)];
}

/** 整本拼完了沒 */
export function albumComplete(size, solved) {
  return PICTURES[size].every((_, p) => isComplete(size, p, solved));
}
