/**
 * 逐列回溯，每找到一個解（每列刺蝟所在的欄）就交給 onSolution；它回傳 true 就停止搜尋。
 * 每列恰好一隻刺蝟，所以相鄰限制只需檢查上一列的刺蝟。
 * cols 在搜尋中會一直變動，要留下來的解請自己複製。
 */
export function search(puzzle, onSolution) {
  const { size, regions } = puzzle;
  const usedCols = new Array(size).fill(false);
  const usedRegions = new Array(size).fill(false);
  const cols = [];

  function place(row) {
    if (row === size) return onSolution(cols);
    for (let col = 0; col < size; col++) {
      const region = regions[row * size + col];
      if (usedCols[col] || usedRegions[region]) continue;
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      usedCols[col] = usedRegions[region] = true;
      cols.push(col);
      const stop = place(row + 1);
      cols.pop();
      usedCols[col] = usedRegions[region] = false;
      if (stop) return true;
    }
    return false;
  }

  place(0);
}

/** 計算解的數量，找到 limit 個就停止。 */
export function countSolutions(puzzle, limit = 2) {
  let found = 0;
  search(puzzle, () => ++found >= limit);
  return found;
}

/** 回傳第一個找到的解（每列刺蝟所在的欄），無解則回傳 null。 */
export function solve(puzzle) {
  let first = null;
  search(puzzle, (cols) => ((first = [...cols]), true));
  return first;
}

/** 回傳一個和 answer 不同的解（每列的欄），沒有就回傳 null。 */
export function otherSolution(puzzle, answer) {
  let other = null;
  search(puzzle, (cols) => cols.some((c, r) => c !== answer[r]) && ((other = [...cols]), true));
  return other;
}
