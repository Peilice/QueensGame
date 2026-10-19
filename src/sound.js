// 音效：全部用 Web Audio 當場合成，不下載任何音檔，離線也一樣有聲音。
// 聲音跟著紙上的動作走：鋼筆劃 ✕ 的沙沙聲、刺蝟蹦進格子的「啵」、翻頁的「唰」、蓋章的「咚」。
// 預設關閉；開關存在 storage，瀏覽器規定要等玩家碰過畫面才能出聲，所以 AudioContext 等第一次手勢才建立。

let ctx = null;
let out = null;
let noiseBuffer = null;
let enabled = false;
let unlockedAt = -Infinity;

/** 開或關；關掉時把 AudioContext 暫停，不佔手機資源 */
export function setEnabled(on) {
  enabled = on;
  if (on) unlock();
  else ctx?.suspend().catch(() => {});
}

/**
 * 在使用者手勢裡呼叫：建立或喚醒 AudioContext。
 * iOS 只在手勢當下允許出聲，所以 main.js 在每次點擊、放開手指時都會叫一次。
 */
export function unlock() {
  if (!enabled) return;
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
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  unlockedAt = performance.now();
}

/** 一個音：頻率從 from 滑到 to，快速起音、指數衰減 */
function tone({ at = 0, from, to = from, dur, gain, type = 'sine' }) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** 一段濾過的雜訊：紙和筆的摩擦聲。filter 頻率可以從 from 滑到 to */
function noise({ at = 0, from, to = from, dur, gain, q = 1, type = 'bandpass' }) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.25);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(out);
  // 每次從雜訊的不同位置開始，沒有兩筆聽起來完全一樣
  src.start(t, Math.random() * 0.8);
  src.stop(t + dur + 0.02);
}

// 過關時刺蝟一隻接一隻跳，音階一格一格往上爬（大調五聲音階，怎麼排都好聽）
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

const SOUNDS = {
  /** 標 ✕：兩筆鋼筆線，和墨跡動畫的兩筆對齊；拖曳時一格只劃一筆 */
  mark(strokes = 2) {
    for (let s = 0; s < strokes; s++) noise({ at: s * 0.1, from: 4200, to: 2600, dur: 0.09, gain: 0.22, q: 0.8 });
  },
  /** 放刺蝟：圓圓的「啵」 */
  queen() {
    tone({ from: 700, to: 330, dur: 0.13, gain: 0.5 });
    tone({ from: 1400, to: 900, dur: 0.04, gain: 0.06, type: 'triangle' });
  },
  /** 拿起刺蝟：反過來往上的「啵」，比較輕 */
  lift() {
    tone({ from: 340, to: 620, dur: 0.09, gain: 0.25 });
  },
  /** 放到會刺到別人的位置：低低的一聲「咚」，接在「啵」後面 */
  conflict() {
    tone({ at: 0.09, from: 200, to: 140, dur: 0.2, gain: 0.32, type: 'triangle' });
  },
  /** 上一步：翻回一頁的「唰」 */
  undo() {
    noise({ from: 2000, to: 800, dur: 0.15, gain: 0.16, q: 0.7 });
  },
  /** 重來：整頁擦掉，「唰」長一點 */
  reset() {
    noise({ from: 2600, to: 500, dur: 0.32, gain: 0.2, q: 0.6 });
  },
  /** 過關：每隻刺蝟跳起來時一個音，間隔和 style.css 的 cheer 動畫一樣是 90ms */
  cheer(count, gap = 0.09) {
    for (let i = 0; i < count; i++) {
      const f = SCALE[Math.min(i, SCALE.length - 1)];
      tone({ at: i * gap + 0.05, from: f, to: f * 1.02, dur: 0.18, gain: 0.2 });
    }
  },
  /** 蓋章：印章壓到紙上的悶響 */
  stamp(at = 0) {
    tone({ at, from: 150, to: 55, dur: 0.25, gain: 0.8 });
    noise({ at, from: 900, to: 300, dur: 0.07, gain: 0.3, type: 'lowpass' });
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
