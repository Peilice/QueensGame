// localStorage 存取；在無痕模式等情況下可能失敗，一律容錯。
// 關卡以 "尺寸-第幾關"（如 "6-3"）識別。
// 隨機題每個尺寸只留一盤玩到一半的（種子＋盤面），另外記各尺寸解了幾題。
const KEY = 'queens-game-v2';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.solved) && data.boards) return { random: { current: {}, solved: {} }, ...data };
  } catch {}
  return { solved: [], boards: {}, random: { current: {}, solved: {} } };
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

/** 所有未完成盤面，以關卡 id 為 key */
export function getBoards() {
  return load().boards;
}


/** 某尺寸玩到一半的隨機題：{ seed, board }，沒有則為 null */
export function getRandom(size) {
  return load().random.current[size] ?? null;
}

export function saveRandom(size, seed, board) {
  const data = load();
  data.random.current[size] = { seed, board };
  save(data);
}

export function clearRandom(size) {
  const data = load();
  delete data.random.current[size];
  save(data);
}

export function markRandomSolved(size) {
  const data = load();
  delete data.random.current[size];
  data.random.solved[size] = (data.random.solved[size] ?? 0) + 1;
  save(data);
}

/** 各尺寸解過幾題隨機題，以尺寸為 key */
export function getRandomSolved() {
  return load().random.solved;
}

/** 手機上自己收合／展開過規則就記住：true／false，沒動過則為 null */
export function getRulesOpen() {
  return load().rulesOpen ?? null;
}

export function setRulesOpen(open) {
  const data = load();
  data.rulesOpen = open;
  save(data);
}

/** 音效開關：預設關閉，玩家自己打開才有聲音 */
export function getSound() {
  return load().sound === true;
}

export function setSound(on) {
  const data = load();
  data.sound = on;
  save(data);
}
