import { EMPTY, MARK, QUEEN, isSolved } from './rules.js';

/** 同一尺寸內：第一關永遠開放，其餘須先破前一關。solved 為該尺寸已破關的索引。 */
export function isUnlocked(level, solved) {
  return level === 0 || solved.has(level - 1);
}

const NEXT ={ [EMPTY]: MARK, [MARK]: QUEEN, [QUEEN]: EMPTY };

/**
 * 單一關卡的盤面狀態與 Undo 歷史。
 * 每個會改動盤面的操作都存成一個歷史步驟（整個盤面的快照）。
 */
export class Game {
  constructor(puzzle, board = null) {
    this.puzzle = puzzle;
    this.board = board ? [...board] : new Array(puzzle.size * puzzle.size).fill(EMPTY);
    this.history = [];
  }

  get solved() {
    return isSolved(this.puzzle, this.board);
  }

  get canUndo() {
    return this.history.length > 0;
  }

  #commit(next) {
    if (next.every((s, i) => s === this.board[i])) return false;
    this.history.push(this.board);
    this.board = next;
    return true;
  }

  /** 點擊：空 → ✕ → 皇后 → 空 */
  cycle(index) {
    const next = [...this.board];
    next[index] = NEXT[next[index]];
    return this.#commit(next);
  }

  /** 拖曳批次標 ✕：只標空格，整批算一步。 */
  mark(indices) {
    const next = [...this.board];
    for (const i of indices) if (next[i] === EMPTY) next[i] = MARK;
    return this.#commit(next);
  }

  reset() {
    return this.#commit(new Array(this.board.length).fill(EMPTY));
  }

  undo() {
    if (!this.canUndo) return false;
    this.board = this.history.pop();
    return true;
  }
}
