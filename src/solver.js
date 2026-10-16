/**
 * 逐列回溯計算解的數量，找到 limit 個就停止。
 * 每列恰好一隻刺蝟，所以相鄰限制只需檢查上一列的刺蝟。
 */
export function countSolutions(puzzle, limit = 2) {
  const { size, regions } = puzzle;
  const usedCols = new Array(size).fill(false);
  const usedRegions = new Array(size).fill(false);
  let found = 0;

  function place(row, prevCol) {
    if (row === size) {
      found++;
      return;
    }
    for (let col = 0; col < size && found < limit; col++) {
      const region = regions[row * size + col];
      if (usedCols[col] || usedRegions[region]) continue;
      if (prevCol !== -1 && Math.abs(prevCol - col) <= 1) continue;
      usedCols[col] = usedRegions[region] = true;
      place(row + 1, col);
      usedCols[col] = usedRegions[region] = false;
    }
  }

  place(0, -1);
  return found;
}

/** 回傳第一個找到的解（每列刺蝟所在的欄），無解則回傳 null。 */
export function solve(puzzle) {
  const { size, regions } = puzzle;
  const usedCols = new Array(size).fill(false);
  const usedRegions = new Array(size).fill(false);
  const cols = [];

  function place(row) {
    if (row === size) return true;
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
  }

  return place(0) ? cols : null;
}
