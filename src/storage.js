// localStorage 存取；在無痕模式等情況下可能失敗，一律容錯。
// 關卡以 "尺寸-第幾關"（如 "6-3"）識別。
// 隨機題每個尺寸只留一盤玩到一半的（種子＋盤面），另外記各尺寸解了幾題。
// 標記中離開的，另外存按下「標記」那一刻的盤面：固定關在 trials，隨機題在 current 的 trial 欄位。
const KEY = 'queens-game-v2';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.solved) && data.boards) return { random: { current: {}, solved: {} }, trials: {}, ...data };
  } catch {}
  return { solved: [], boards: {}, trials: {}, random: { current: {}, solved: {} } };
}

/** 讀出存檔、交給 change 改、再存回去 */
function update(change) {
  const data = load();
  change(data);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getSolved() {
  return new Set(load().solved);
}

export function markSolved(level) {
  update((data) => {
    if (!data.solved.includes(level)) data.solved.push(level);
    delete data.boards[level];
    delete data.trials[level];
  });
}

export function getBoard(level) {
  return load().boards[level] ?? null;
}

/** 標記中離開時按下「標記」那一刻的盤面，不在標記中則為 null */
export function getTrial(level) {
  return load().trials[level] ?? null;
}

export function saveBoard(level, board, trial = null) {
  update((data) => {
    data.boards[level] = board;
    if (trial) data.trials[level] = trial;
    else delete data.trials[level];
  });
}

/** 所有未完成盤面，以關卡 id 為 key */
export function getBoards() {
  return load().boards;
}

/** 某尺寸玩到一半的隨機題：{ seed, board }，標記中離開的多一個 trial；沒有則為 null */
export function getRandom(size) {
  return load().random.current[size] ?? null;
}

export function saveRandom(size, seed, board, trial = null) {
  update((data) => {
    data.random.current[size] = trial ? { seed, board, trial } : { seed, board };
  });
}

export function clearRandom(size) {
  update((data) => {
    delete data.random.current[size];
  });
}

export function markRandomSolved(size) {
  update((data) => {
    delete data.random.current[size];
    data.random.solved[size] = (data.random.solved[size] ?? 0) + 1;
  });
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
  update((data) => (data.rulesOpen = open));
}

/** 音效開關：預設打開，玩家自己關掉才安靜 */
export function getSound() {
  return load().sound !== false;
}

export function setSound(on) {
  update((data) => (data.sound = on));
}

/** 背景音樂開關：和音效分開，一樣預設打開 */
export function getMusic() {
  return load().music !== false;
}

export function setMusic(on) {
  update((data) => (data.music = on));
}
