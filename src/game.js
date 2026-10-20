import { EMPTY, MARK, QUEEN, isSolved } from './rules.js';

/** 同一尺寸內：第一關永遠開放，其餘須先破前一關。solved 為該尺寸已破關的索引。 */
export function isUnlocked(level, solved) {
  return level === 0 || solved.has(level - 1);
}

const NEXT ={ [EMPTY]: MARK, [MARK]: QUEEN, [QUEEN]: EMPTY };

/**
 * 單一關卡的盤面狀態與 Undo 歷史。
 * 每個會改動盤面的操作都存成一個歷史步驟（整個盤面的快照，連同當時的標記狀態）。
 *
 * 標記（試放）：trial 是按下「標記」那一刻的盤面，不在標記中時是 null。
 * 標記中畫的格子不另外存，跟 trial 不一樣的格子就是；所以「上一步」退回去時範圍也跟著退。
 */
export class Game {
  constructor(puzzle, board = null, trial = null) {
    this.puzzle = puzzle;
    this.board = board ? [...board] : new Array(puzzle.size * puzzle.size).fill(EMPTY);
    this.trial = trial && trial.length === this.board.length ? [...trial] : null;
    this.history = [];
  }

  get solved() {
    return isSolved(this.puzzle, this.board);
  }

  get canUndo() {
    return this.history.length > 0;
  }

  get trying() {
    return this.trial !== null;
  }

  /** 標記中畫的格子：跟按下「標記」時不一樣的那些 */
  get tentative() {
    const set = new Set();
    if (this.trial) this.board.forEach((s, i) => s !== this.trial[i] && set.add(i));
    return set;
  }

  #commit(next, trial = this.trial) {
    if (trial === this.trial && next.every((s, i) => s === this.board[i])) return false;
    this.history.push({ board: this.board, trial: this.trial });
    this.board = next;
    // 標記中剛好解開：試放的就是答案，直接當作留下
    this.trial = this.solved ? null : trial;
    return true;
  }

  /** 點擊：空 → ✕ → 刺蝟 → 空 */
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

  /** 從 ✕ 開始拖曳批次擦 ✕：只擦 ✕，刺蝟不動，整批算一步。 */
  unmark(indices) {
    const next = [...this.board];
    for (const i of indices) if (next[i] === MARK) next[i] = EMPTY;
    return this.#commit(next);
  }

  /** 重來：清空盤面，標記中也一起結束 */
  reset() {
    return this.#commit(new Array(this.board.length).fill(EMPTY), null);
  }

  /** 標記：記下現在的盤面，之後畫的都是試放；只有一層，標記中不能再按 */
  startTrial() {
    return !this.trying && this.#commit(this.board, this.board);
  }

  /** 留下：試放的全部算數，結束標記 */
  keep() {
    return this.trying && this.#commit(this.board, null);
  }

  /** 擦掉：盤面回到按下「標記」那一刻，結束標記 */
  erase() {
    return this.trying && this.#commit(this.trial, null);
  }

  undo() {
    if (!this.canUndo) return false;
    ({ board: this.board, trial: this.trial } = this.history.pop());
    return true;
  }
}
