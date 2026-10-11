// localStorage 存取；在無痕模式等情況下可能失敗，一律容錯。
const KEY = 'queens-game-v1';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.solved) && data.boards) return data;
  } catch {}
  return { solved: [], boards: {} };
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getSolved() {
  return new Set(load().solved);
}

export function markSolved(level) {
  const data = load();
  if (!data.solved.includes(level)) data.solved.push(level);
  delete data.boards[level];
  save(data);
}

export function getBoard(level) {
  return load().boards[level] ?? null;
}

export function saveBoard(level, board) {
  const data = load();
  data.boards[level] = board;
  save(data);
}

export function clearBoard(level) {
  const data = load();
  delete data.boards[level];
  save(data);
}
