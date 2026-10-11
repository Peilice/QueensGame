// 格子狀態
export const EMPTY = 0;
export const MARK = 1;
export const QUEEN = 2;

/**
 * 把題目字串陣列轉成內部結構。
 * 每個字元代表該格所屬的色塊，相同字元即同一色塊。
 */
export function parsePuzzle(rows) {
  const size = rows.length;
  const ids = new Map();
  const regions = [];
  for (const row of rows) {
    if (row.length !== size) throw new Error('題目必須是正方形');
    for (const ch of row) {
      if (!ids.has(ch)) ids.set(ch, ids.size);
      regions.push(ids.get(ch));
    }
  }
  if (ids.size !== size) throw new Error(`色塊數量 ${ids.size} 與尺寸 ${size} 不符`);
  return { size, regions };
}

function attacks(puzzle, a, b) {
  const { size, regions } = puzzle;
  const ra = Math.floor(a / size), ca = a % size;
  const rb = Math.floor(b / size), cb = b % size;
  return (
    ra === rb ||
    ca === cb ||
    regions[a] === regions[b] ||
    (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1)
  );
}

/** 回傳互相衝突的皇后格子索引集合。 */
export function findConflicts(puzzle, board) {
  const queens = [];
  board.forEach((s, i) => { if (s === QUEEN) queens.push(i); });
  const conflicts = new Set();
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      if (attacks(puzzle, queens[i], queens[j])) {
        conflicts.add(queens[i]);
        conflicts.add(queens[j]);
      }
    }
  }
  return conflicts;
}

/** 放滿 N 個皇后且互不衝突即過關，✕ 不影響判定。 */
export function isSolved(puzzle, board) {
  const count = board.filter((s) => s === QUEEN).length;
  return count === puzzle.size && findConflicts(puzzle, board).size === 0;
}
