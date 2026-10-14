import { findConflicts, isSolved, MARK, QUEEN } from './rules.js';

// 教學用的 5×5 題目：正中央是只有一格的色塊，右上角的窄色塊整個落在最右邊那一行。
// 前面幾步做完後，第 4 列只剩一個空格，剩下的一路推得出來。也經 scripts/verify-puzzles.js 驗證為唯一解。
export const LESSON = ['AAAAB', 'AAAAB', 'CCDEE', 'CCCEE', 'CCCEE'];

const N = LESSON.length;
const at = (r, c) => r * N + c;
const CENTER = at(2, 2);
const all = [...Array(N * N).keys()];
const row = (i) => Math.floor(i / N);
const col = (i) => i % N;

/**
 * 教學的每一步：引導文字、要亮起來提示的格子，以及完成條件。
 * 有 want 的步驟：cells 全部變成 want 就算完成，還沒做到的格子會亮起。
 * 其餘步驟用 done(puzzle, board) 判定；undo 代表要提示「上一步」按鈕。
 * 完成條件只看盤面，玩家可以自由多做，不會被卡住。
 * 文字裡的  、⁠ 是不斷行的空白與連接符，讓「標 ✕」「按「上一步」」不被拆到兩行。
 */
export const STEPS = [
  {
    text: '正中央這個色塊只有一格，刺蝟一定在這裡。點一下標 ✕，再點一下放上刺蝟。',
    cells: [CENTER],
    want: QUEEN,
  },
  {
    text: '同一列、同一行不能再有刺蝟。按住拖曳，把亮起的格子一口氣標 ✕。',
    cells: all.filter((i) => i !== CENTER && (row(i) === 2 || col(i) === 2)),
    want: MARK,
  },
  {
    text: '刺蝟靠太近會被刺到，斜角也不行。試試看：在亮起的格子放一隻刺蝟。',
    cells: [at(1, 3)],
    done: (puzzle, board) => findConflicts(puzzle, board).size > 0,
  },
  {
    text: '被刺到了！紅框就是衝突。按⁠「上一步」收回來。',
    cells: [],
    undo: true,
    done: (puzzle, board) => findConflicts(puzzle, board).size === 0,
  },
  {
    text: '所以刺蝟周圍一圈都不能放，把亮起的格子標 ✕。',
    cells: all.filter((i) => i !== CENTER && Math.abs(row(i) - 2) <= 1 && Math.abs(col(i) - 2) <= 1),
    want: MARK,
  },
  {
    text: '右上角的色塊整個在最右邊這一行，這一行的刺蝟一定在它裡面。把這一行其他格標 ✕。',
    cells: [at(3, 4), at(4, 4)],
    want: MARK,
  },
  {
    text: '剩下的你來！每一列、每一行、每個色塊各一隻。提示：先找只剩一個空格的那一列。',
    cells: [],
    done: isSolved,
  },
];

export function isDone(step, puzzle, board) {
  return step.done ? step.done(puzzle, board) : step.cells.every((i) => board[i] === step.want);
}

/** 這一步要亮起的格子：有 want 的只亮還沒做到的 */
export function targets(step, board) {
  return step.want === undefined ? step.cells : step.cells.filter((i) => board[i] !== step.want);
}

/** 從 from 往後跳過已經完成的步驟，回傳現在該做的那一步；只會前進，不會退回 */
export function currentStep(puzzle, board, from = 0) {
  let step = from;
  while (step < STEPS.length - 1 && isDone(STEPS[step], puzzle, board)) step++;
  return step;
}
