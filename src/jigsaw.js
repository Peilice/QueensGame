// 拼圖片的形狀：n×n 片，每片 100 單位見方，相鄰兩片的接縫有一個凸耳（一邊凸、另一邊凹）。
// 凸耳往哪邊由種子決定，同一幅拼圖每次畫出來都一樣。

export const UNIT = 100;

/** 簡單的種子亂數（mulberry32），回傳 0–1 */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 字串轉成種子：同一幅拼圖的 id 永遠得到同一組凸耳 */
export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** 每條內部接縫的凸耳方向：h[r][c] 是第 r 條橫線第 c 段，v[r][c] 是第 r 列第 c 條直線；1 或 -1 */
export function tabs(n, seed) {
  const rnd = seeded(seed);
  const pick = () => (rnd() < 0.5 ? 1 : -1);
  return {
    h: Array.from({ length: n + 1 }, () => Array.from({ length: n }, pick)),
    v: Array.from({ length: n }, () => Array.from({ length: n + 1 }, pick)),
  };
}

const f1 = (v) => +v.toFixed(1);

// 一個凸耳的輪廓：沿著接縫的位置 t（0–1）和往外凸的距離 k（以邊長為單位）；左右對稱，反著走形狀也一樣
const NECK = [
  [0.36, 0], [0.42, 0], [0.4, 0.1], [0.37, 0.14], [0.32, 0.22], [0.4, 0.3], [0.5, 0.3],
  [0.6, 0.3], [0.68, 0.22], [0.63, 0.14], [0.6, 0.1], [0.58, 0], [0.64, 0],
];

/** 從 (ax, ay) 畫到 (bx, by) 的一條邊；(nx, ny) 是凸耳的方向，flat 為外框直線 */
function edge(ax, ay, bx, by, nx, ny, flat) {
  if (flat) return `L${bx} ${by}`;
  const len = Math.hypot(bx - ax, by - ay);
  const p = ([t, k]) => `${f1(ax + (bx - ax) * t + nx * k * len)} ${f1(ay + (by - ay) * t + ny * k * len)}`;
  const [s, ...rest] = NECK.map(p);
  let d = `L${s}`;
  for (let i = 0; i < rest.length; i += 3) d += `C${rest[i]} ${rest[i + 1]} ${rest[i + 2]}`;
  return `${d}L${bx} ${by}`;
}

/** 第 i 片（由左上往右、一列一列數）的 SVG 路徑 */
export function piecePath(n, t, i) {
  const r = Math.floor(i / n), c = i % n;
  const x0 = c * UNIT, y0 = r * UNIT, x1 = x0 + UNIT, y1 = y0 + UNIT;
  return (
    `M${x0} ${y0}` +
    edge(x0, y0, x1, y0, 0, -t.h[r][c], r === 0) +
    edge(x1, y0, x1, y1, t.v[r][c + 1], 0, c === n - 1) +
    edge(x1, y1, x0, y1, 0, -t.h[r + 1][c], r === n - 1) +
    edge(x0, y1, x0, y0, t.v[r][c], 0, c === 0) +
    'Z'
  );
}
