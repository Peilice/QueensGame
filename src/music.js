// 背景音樂：和音效一樣用 Web Audio 當場合成，不下載音檔，離線也一樣有音樂。
// C 大調五聲音階、92 BPM，八個和弦各一小節一輪約 21 秒。弦樂旋律每兩小節換一個節奏、在五聲音階上一格一格走，
// 底下是第 1、3 拍的低音和 2、4 拍輕刷的和弦，不用任何打擊聲；旋律每次隨機，不會有兩輪一樣。
// 預設打開、全站都播；AudioContext 由 sound.js 管，音樂走自己的那一條音量線路，和音效分開開關。

import * as sound from './sound.js';

const BPM = 92;
const STEP = 60 / BPM / 2; // 八分音符
const BAR = 8; // 一小節八個八分音符，每個和弦一小節
const FADE_IN = 2;

export const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// pc：這個和弦撥旋律用的五聲音階（音名 0–11）；過關的音階也從 root 沿著它往上爬
const C = { name: 'C', root: 0, bass: 48, pad: [60, 64, 67], pc: [0, 2, 4, 7, 9] };
const Am = { name: 'Am', root: 9, bass: 45, pad: [57, 60, 64], pc: [9, 0, 2, 4, 7] };
const F = { name: 'F', root: 5, bass: 41, pad: [57, 60, 65], pc: [5, 7, 9, 0, 2] };
const G = { name: 'G', root: 7, bass: 43, pad: [59, 62, 67], pc: [7, 9, 11, 2, 4] };
export const CHORDS = [C, G, Am, F, C, F, G, C];
const LOOP = CHORDS.length * BAR;
// 一小節裡哪幾格要敲；每兩小節用同一個節奏，一問一答
const RHYTHMS = [[0, 2, 3, 4, 6], [0, 1, 2, 4, 6, 7], [0, 3, 4, 6], [0, 2, 4, 5, 6], [0, 2, 3, 5, 6, 7]];

/** 從 lo 到 hi 之間、音名在 pc 裡的音 */
export function notesIn(pc, lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (pc.includes(m % 12)) out.push(m);
  return out;
}

/** 過關音階：從這個和弦的根音（C5 附近）沿著它的五聲音階往上爬 count 個音 */
export function climb(chord, count) {
  const lo = 72 + chord.root - (chord.root > 4 ? 12 : 0);
  return notesIn(chord.pc, lo, lo + 36).slice(0, count);
}

/**
 * 一小節的旋律：在 rhythm 的每一格上，沿著五聲音階往上或往下走一兩格；第一拍落在和弦內音。
 * 回傳 Map（第幾格 → 音）和最後一個音，下一小節從那裡接著走。標記中只留第 1、3 拍
 */
export function planBar(chord, rhythm, lastNote, trying, random = Math.random) {
  const slots = trying ? rhythm.filter((s) => s % 4 === 0) : rhythm;
  const pool = notesIn(chord.pc, 67, 86);
  const nearest = (m) => pool.reduce((best, x, i) => (Math.abs(x - m) < Math.abs(pool[best] - m) ? i : best), 0);
  let idx = lastNote == null ? Math.floor(pool.length / 2) : nearest(lastNote);
  const plan = new Map();
  for (const s of slots) {
    if (s === 0) {
      const tones = pool.flatMap((m, i) => ([chord.root, chord.pc[1], chord.pc[2]].includes(m % 12) ? [i] : []));
      idx = tones.reduce((best, i) => (Math.abs(i - idx) < Math.abs(best - idx) ? i : best));
    } else {
      idx += [-2, -1, -1, 1, 1, 1, 2][Math.floor(random() * 7)];
      idx = Math.max(0, Math.min(pool.length - 1, idx));
    }
    plan.set(s, pool[idx]);
  }
  return { plan, last: pool[idx] ?? lastNote };
}

let enabled = false;
let trying = false;
let a = null; // sound.audio()：{ ctx, bus }
let mood = null; // 標記中把高頻濾掉，音樂像隔著一層紙
let fade = null; // 淡入淡出、過關讓位
let timer = null;
let step = 0;
let nextTime = 0;
let rhythm = RHYTHMS[0];
let bar = new Map();
let lastNote = null;
let chordLog = []; // [{ t, i }]：什麼時候換到第幾個和弦，過關時查「現在」是哪個

/** 開或關；打開後要等 wake() 才開始播，打開網址時不會突然響 */
export function setEnabled(on) {
  enabled = on;
  sound.setMusicEnabled(on);
  if (!on) stop();
}

/** 在使用者手勢裡、或回到前景時呼叫：音樂開著但還沒在播，就開始播 */
export function wake() {
  if (!enabled || timer) return;
  a = sound.audio();
  if (!a) return;
  if (!mood) {
    mood = a.ctx.createBiquadFilter();
    mood.type = 'lowpass';
    mood.Q.value = 0.5;
    fade = a.ctx.createGain();
    fade.gain.value = 0.0001;
    mood.connect(fade).connect(a.bus);
  }
  mood.frequency.value = trying ? 1200 : 8000;
  restart(a.ctx.currentTime + 0.05);
  timer = setInterval(tick, 25);
  tick();
}

/** 淡出、停下排程；切到背景時也用這個 */
export function stop(time = 0.6) {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  fadeTo(0.0001, a.ctx.currentTime, time);
}

/** 標記中：音樂變悶，旋律只留第 1、3 拍 */
export function setTrial(on) {
  if (trying === on) return;
  trying = on;
  mood?.frequency.setTargetAtTime(on ? 1200 : 8000, a.ctx.currentTime, 0.4);
}

/** 過關：音樂讓位給刺蝟的音階；蓋章（stampAt 秒後）之後再停一小節，從第一個和弦淡入新的一輪 */
export function win(stampAt) {
  if (!timer) return;
  const now = a.ctx.currentTime;
  fadeTo(0.0001, now, 0.3);
  restart(now + stampAt + BAR * STEP);
}

/** 過關音階的頻率：從現在這個和弦起跳，音樂沒在播就從 C 開始 */
export function cheerNotes(count) {
  return climb(timer ? currentChord() : C, count).map(hz);
}

function currentChord() {
  const now = a.ctx.currentTime;
  let i = 0;
  for (const c of chordLog) if (c.t <= now) i = c.i;
  return CHORDS[i];
}

/** 從第一個和弦重新開始，在 at 那一刻淡入 */
function restart(at) {
  step = 0;
  nextTime = at;
  lastNote = null;
  chordLog = [];
  fade.gain.setValueAtTime(0.0001, at);
  fade.gain.exponentialRampToValueAtTime(1, at + FADE_IN);
}

function fadeTo(value, at, time) {
  const g = fade.gain;
  g.cancelScheduledValues(at);
  g.setValueAtTime(Math.max(g.value, 0.0001), at);
  g.exponentialRampToValueAtTime(value, at + time);
}

/** 每 25ms 往前排 0.15 秒內要響的音，切到別的分頁計時器變慢也不會斷拍 */
function tick() {
  while (nextTime < a.ctx.currentTime + 0.15) {
    playStep(step, nextTime);
    nextTime += STEP;
    step = (step + 1) % LOOP;
  }
}

function playStep(s, t) {
  const i = Math.floor(s / BAR);
  const chord = CHORDS[i];
  const pos = s % BAR;
  if (pos === 0) {
    chordLog.push({ t, i });
    if (chordLog.length > CHORDS.length) chordLog.shift();
    if (i % 2 === 0) rhythm = RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)];
    ({ plan: bar, last: lastNote } = planBar(chord, rhythm, lastNote, trying));
  }
  // 低音在第 1、3 拍，第 3 拍彈五度；和弦在 2、4 拍輕輕刷一下
  if (pos === 0) bass(chord.bass, t, 0.5);
  if (pos === 4) bass(chord.bass + 7, t, 0.35);
  if (pos === 2 || pos === 6) for (const m of chord.pad) strum(m, t, STEP * 1.6);
  const m = bar.get(pos);
  // 稍微不準時一點，聽起來比較像人在敲
  if (m != null) bow(m, t + Math.random() * 0.015, (pos === 0 ? 0.14 : 0.11) + Math.random() * 0.03);
}

/** 起音快、指數衰減的包絡，接到標記中的濾波器 */
function envelope(t, gain, attack, release) {
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + release);
  env.connect(mood);
  return env;
}

function osc(freq, t, dur, out, type = 'sine') {
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/**
 * 旋律：弦樂，兩條稍微走音的鋸齒波疊起來像一小組人在拉，濾掉刺耳的高頻、加一點揉弦；
 * 弓拉進來的起音柔、沒有「敲」的那一下，不會一直把耳朵拉過去；尾巴夠短，跟得上輕快的節奏
 */
function bow(m, t, gain) {
  const dur = 1;
  const lp = a.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  lp.Q.value = 0.7;
  lp.connect(envelope(t, gain, 0.08, dur));
  const vibrato = a.ctx.createOscillator();
  const depth = a.ctx.createGain();
  vibrato.frequency.value = 5.5;
  depth.gain.value = 6; // cents
  vibrato.connect(depth);
  vibrato.start(t);
  vibrato.stop(t + dur + 0.05);
  for (const cents of [-5, 5]) {
    const o = a.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz(m);
    o.detune.value = cents;
    depth.connect(o.detune);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** 低音：彈一下就收，給整首一點彈跳感 */
function bass(m, t, gain) {
  osc(hz(m), t, 0.35, envelope(t, gain, 0.01, 0.35));
}

/** 和弦：很輕的短和音，像吉他輕刷 */
function strum(m, t, dur) {
  const lp = a.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.connect(envelope(t, trying ? 0.05 : 0.07, 0.02, dur));
  osc(hz(m), t, dur, lp, 'triangle');
}
