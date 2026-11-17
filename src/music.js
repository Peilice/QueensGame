// 背景音樂：Kevin MacLeod 的三首輕快小曲（music/，CC BY 3.0，出處見 README 和聲音設定紙卡），隨機輪流播。
// 音檔用 <audio> 邊下載邊播，不整首解碼（一首解開來要好幾十 MB，手機吃不消），再接進 sound.js 的 AudioContext，
// 走音樂自己的那一條音量線路，和音效分開開關；標記中加一層低通、過關時讓位，都在這條線路上做。
// 音檔不預先存進離線快取（sw.js 不攔 music/），離線又沒抓過時就是沒有音樂，遊戲照樣能玩。

import * as sound from './sound.js';

export const TRACKS = ['music/carefree.mp3', 'music/monkeys-spinning-monkeys.mp3', 'music/cattails.mp3'];
// 三首在轉檔時已經調成一樣的平均音量（RMS 約 0.11）；這裡再壓到和音效搭配起來剛好的大小
const LEVEL = 0.45;
const FADE_IN = 2;
const TAIL = 1.5; // 一首快播完時淡出，接下一首

/**
 * 下一首：一輪裡每首都播過一次才重來，換輪時也不會連著兩次同一首。
 * played 是這一輪已經播過的，回傳 { next, played }
 */
export function pick(played, last, random = Math.random) {
  let left = TRACKS.filter((t) => !played.includes(t));
  if (left.length === 0) {
    played = [];
    left = TRACKS.filter((t) => t !== last);
  }
  const next = left[Math.floor(random() * left.length)];
  return { next, played: [...played, next] };
}

let enabled = false;
let el = null; // 唯一一個 <audio>：換曲只換 src，iOS 第一次在手勢裡播過之後就能一直播下去
let a = null; // sound.audio()：{ ctx, bus }
let mood = null; // 標記中把高頻濾掉，音樂像隔著一層紙
let fade = null; // 淡入淡出、換曲
let duck = null; // 過關讓位
let playing = false;
let played = [];
let last = null;
let switching = false;
let pauseTimer = null;

/** 開或關；打開後要等 wake() 才開始播，打開網址時不會突然響 */
export function setEnabled(on) {
  enabled = on;
  sound.setMusicEnabled(on);
  if (!on) stop();
}

/** 在使用者手勢裡、或回到前景時呼叫：音樂開著但還沒在播，就接著上次的位置淡入 */
export function wake() {
  if (!enabled || playing) return;
  a = sound.audio();
  if (!a) return;
  if (!el) setup();
  clearTimeout(pauseTimer);
  playing = true;
  if (!el.src) load();
  el.play().catch(() => (playing = false));
  fadeTo(1, FADE_IN);
}

/** 淡出、暫停；切到背景時也用這個，回來從同一個地方接著播 */
export function stop(time = 0.6) {
  if (!playing) return;
  playing = false;
  fadeTo(0.0001, time);
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => !playing && el.pause(), time * 1000 + 50);
}

/** 標記中：音樂變悶 */
export function setTrial(on) {
  mood?.frequency.setTargetAtTime(on ? 1200 : 8000, a.ctx.currentTime, 0.4);
}

/** 過關：音樂壓到兩成讓刺蝟的音階和蓋章出來，蓋章（stampAt 秒後）一秒半之後慢慢回來 */
export function win(stampAt) {
  if (!duck) return;
  const t = a.ctx.currentTime;
  duck.gain.cancelScheduledValues(t);
  duck.gain.setTargetAtTime(0.2, t, 0.08);
  duck.gain.setTargetAtTime(1, t + stampAt + 1.5, 0.6);
}

function setup() {
  el = new Audio();
  el.preload = 'auto';
  mood = a.ctx.createBiquadFilter();
  mood.type = 'lowpass';
  mood.frequency.value = 8000;
  mood.Q.value = 0.5;
  fade = a.ctx.createGain();
  fade.gain.value = 0.0001;
  duck = a.ctx.createGain();
  const level = a.ctx.createGain();
  level.gain.value = LEVEL;
  a.ctx.createMediaElementSource(el).connect(mood).connect(level).connect(fade).connect(duck).connect(a.bus);
  // 快播完時淡出、接下一首；抓不到（離線）就停在那裡，不一直重試
  el.addEventListener('timeupdate', () => {
    if (playing && !switching && el.duration - el.currentTime < TAIL) next();
  });
  el.addEventListener('ended', () => playing && next());
  el.addEventListener('error', () => {
    playing = false;
    el.removeAttribute('src'); // 下次 wake() 換一首重抓
  });
}

function load() {
  ({ next: last, played } = pick(played, last));
  el.src = last;
}

function next() {
  switching = true;
  fadeTo(0.0001, TAIL * 0.8);
  setTimeout(() => {
    switching = false;
    if (!playing) return;
    load();
    el.play().catch(() => (playing = false));
    fadeTo(1, FADE_IN);
  }, TAIL * 1000);
}

function fadeTo(value, time) {
  const g = fade.gain;
  const t = a.ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(Math.max(g.value, 0.0001), t);
  g.exponentialRampToValueAtTime(value, t + time);
}
