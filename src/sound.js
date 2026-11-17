// 音效：全部用 Web Audio 當場合成，不下載任何音檔，離線也一樣有聲音。
// 配背景音樂的烏克麗麗、口哨，用木琴、鐵琴、木魚這類原聲樂器的音色：鉛筆輕點 ✕、木琴「咚」放刺蝟、
// 木魚叩一下是上一步、滑哨是重來、鐵琴琶音和蓋章的「咚」是過關。劃 ✕ 最常響，所以最短最小聲。
// 預設打開；開關存在 storage，瀏覽器規定要等玩家碰過畫面才能出聲，所以 AudioContext 等第一次手勢才建立。
// 背景音樂（music.js）的音檔也接進同一個 AudioContext，走自己的音量線路，音效和音樂分開開關。

let ctx = null;
let out = null;
let musicBus = null;
let noiseBuffer = null;
let enabled = false;
let musicEnabled = false;
let unlockedAt = -Infinity;

/** 音效開或關 */
export function setEnabled(on) {
  enabled = on;
  update();
}

/** 音樂開或關：只決定 AudioContext 要不要醒著，排程交給 music.js */
export function setMusicEnabled(on) {
  musicEnabled = on;
  update();
}

/** 音效、音樂都關掉時把 AudioContext 暫停，不佔手機資源；等音樂淡出完再停 */
function update() {
  if (enabled || musicEnabled) unlock();
  else setTimeout(() => !enabled && !musicEnabled && sleep(), 700);
}

/** 切到背景時暫停 AudioContext；回來後下一次 unlock 會再喚醒 */
export function sleep() {
  ctx?.suspend().catch(() => {});
}

/** 給背景音樂用：AudioContext 和音樂的音量線路；還沒建立時是 null */
export function audio() {
  return ctx && { ctx, bus: musicBus };
}

/**
 * 在使用者手勢裡呼叫：建立或喚醒 AudioContext。
 * iOS 只在手勢當下允許出聲，所以 main.js 在每次點擊、放開手指時都會叫一次。
 */
export function unlock() {
  if (!enabled && !musicEnabled) return;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    // ambient：和玩家正在聽的音樂混在一起，不打斷它；iPhone 的靜音鍵打開時也跟著靜音
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    } catch {}
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    // 音樂線路大約是音效的四成，聽起來是背景，不搶音效
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.2;
    musicBus.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  unlockedAt = performance.now();
}

/** 一個音：頻率從 from 滑到 to，快速起音、指數衰減 */
function tone({ at = 0, from, to = from, dur, gain, type = 'sine', attack = 0.004 }) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** 一小段濾過的雜訊，一下子就收：鉛筆尖、木琴槌碰到琴鍵的那一下 */
function tick({ at = 0, freq, dur, gain, q = 1 }) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(out);
  // 每次從雜訊的不同位置開始，沒有兩下聽起來完全一樣
  src.start(t, Math.random() * 0.8);
  src.stop(t + dur + 0.02);
}

/** 木琴：基音加上木琴片特有的 4 倍泛音（收得快），前面一點槌子敲到的聲音 */
function marimba(freq, at, gain) {
  tone({ at, from: freq, dur: 0.35, gain, attack: 0.003 });
  tone({ at, from: freq * 4, dur: 0.06, gain: gain * 0.25, attack: 0.003 });
  tick({ at, freq: freq * 3, dur: 0.01, gain: gain * 0.15, q: 2 });
}

/** 鐵琴：基音加上 2.76、5.4 倍的鐘聲泛音，尾巴長、亮 */
function glock(freq, at, gain = 0.18) {
  tone({ at, from: freq, dur: 0.6, gain, attack: 0.003 });
  tone({ at, from: freq * 2.76, dur: 0.25, gain: gain * 0.35, attack: 0.003 });
  tone({ at, from: freq * 5.4, dur: 0.1, gain: gain * 0.12, attack: 0.003 });
}

/** 木魚：短、乾 */
function woodblock(freq, at, gain) {
  tone({ at, from: freq, dur: 0.07, gain, attack: 0.003 });
  tone({ at, from: freq * 2.3, dur: 0.03, gain: gain * 0.3, attack: 0.003 });
  tick({ at, freq: freq * 1.5, dur: 0.008, gain: gain * 0.3, q: 4 });
}

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// 過關的鐵琴琶音：C 大調的 C-E-G 一路往上，九隻刺蝟也夠用；不管背景音樂播到哪都不會打架
const CHEER = [72, 76, 79, 84, 88, 91, 96, 100, 103].map(hz);

const SOUNDS = {
  /** 標 ✕：鉛筆輕點，又短又小聲，拖一整排也不吵；拖曳時一格只點一下 */
  mark(strokes = 2) {
    for (let s = 0; s < strokes; s++) {
      tick({ at: s * 0.08, freq: 3200 + Math.random() * 600, dur: 0.025, gain: 0.18, q: 1.5 });
      tick({ at: s * 0.08 + 0.012, freq: 2200, dur: 0.02, gain: 0.08 });
    }
  },
  /** 放刺蝟：木琴 E5「咚」，帶一點往下滑的氣泡聲，還是有「啵」的感覺 */
  queen() {
    marimba(hz(76), 0, 0.38);
    tone({ from: 900, to: 450, dur: 0.08, gain: 0.12 });
  },
  /** 拿起刺蝟：兩個很快往上的木琴音（D5 → A5），比較輕 */
  lift() {
    marimba(hz(74), 0, 0.2);
    marimba(hz(81), 0.05, 0.2);
  },
  /** 放到會刺到別人的位置：低低的一聲「咚」，接在「啵」後面，刻意不在調上，聽得出放錯了 */
  conflict() {
    tone({ at: 0.09, from: 200, to: 140, dur: 0.2, gain: 0.32, type: 'triangle' });
  },
  /** 上一步：木魚往回叩兩下 */
  undo() {
    woodblock(1000, 0, 0.28);
    woodblock(760, 0.07, 0.2);
  },
  /** 重來：整頁清掉，往下滑的滑哨 */
  reset() {
    tone({ from: 1400, to: 380, dur: 0.4, gain: 0.13, attack: 0.02 });
  },
  /** 擦掉試放：比鉛筆軟的兩下；拖曳擦 ✕ 時一格只擦一下 */
  erase(strokes = 2) {
    for (let s = 0; s < strokes; s++) tick({ at: s * 0.09, freq: 1300, dur: 0.06, gain: 0.16, q: 0.8 });
  },
  /** 過關：每隻刺蝟跳起來時一個鐵琴音往上爬，間隔和 style.css 的 cheer 動畫一樣是 90ms */
  cheer(count, gap = 0.09) {
    for (let i = 0; i < count; i++) glock(CHEER[i % CHEER.length], i * gap + 0.05);
  },
  /** 蓋章：印章壓到紙上的悶響加木魚，最後鐵琴「叮」一聲 */
  stamp(at = 0) {
    tone({ at, from: 140, to: 60, dur: 0.22, gain: 0.6 });
    woodblock(600, at, 0.3);
    glock(hz(96), at + 0.12, 0.12);
  },
};

/**
 * 播一個音效；關著、或瀏覽器還不讓出聲時什麼都不做。
 * 剛在手勢裡喚醒、resume 還沒完成時照樣排進去，醒來就會響，第一下不會被吃掉
 */
export function play(name, ...args) {
  if (!enabled || !ctx) return;
  if (ctx.state !== 'running' && performance.now() - unlockedAt > 500) return;
  SOUNDS[name](...args);
}
