// 拼圖片的形狀：n×n 片，每片大約 100 單位見方。
// 片與片交會的角點會隨機挪一點（外框上的點只沿著外框滑），所以每片大小、歪斜都不太一樣；
// 每條內部接縫有一個凸耳（一邊凸、另一邊凹），凸耳的位置、大小、頸部、歪的角度、接縫的彎度也各不相同。
// 全部由種子決定，同一幅拼圖每次畫出來都一樣。

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

/** 字串轉成種子：同一幅拼圖的 id 永遠得到同一組形狀 */
export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// 角點最多挪多遠（單位）；凸耳最高 30 單位，對邊兩個凹進來的凸耳加上彎度也碰不到
const JITTER = 10;

/**
 * 一幅拼圖的形狀。
 * pts[r][c]：第 r 條橫線和第 c 條直線交會的角點 [x, y]
 * h[r][c]：第 r 條橫線第 c 段（由左往右）的凸耳；v[r][c]：第 r 列第 c 條直線（由上往下）的凸耳
 * 凸耳是 { dir, at, wide, tall, lean, bend }，dir 是 1（往上／往左凸）或 -1；外框的線是 null
 */
export function tabs(n, seed) {
  const rnd = seeded(seed);
  const between = (a, b) => a + (b - a) * rnd();
  const nudge = () => between(-JITTER, JITTER);
  const pts = Array.from({ length: n + 1 }, (_, r) =>
    Array.from({ length: n + 1 }, (_, c) => {
      const x = c * UNIT + (c > 0 && c < n ? nudge() : 0);
      const y = r * UNIT + (r > 0 && r < n ? nudge() : 0);
      return [x, y];
    }),
  );
  const tab = () => ({
    dir: rnd() < 0.5 ? 1 : -1,
    at: between(0.3, 0.7), // 凸耳在接縫上的位置
    wide: between(0.8, 1.15), // 寬窄
    tall: between(0.75, 1), // 高矮
    lean: between(-0.2, 0.2), // 往左右歪
    bend: between(-0.04, 0.04), // 整條接縫的彎度
  });
  const shape = {
    pts,
    h: Array.from({ length: n + 1 }, (_, r) => Array.from({ length: n }, () => (r > 0 && r < n ? tab() : null))),
    v: Array.from({ length: n }, () => Array.from({ length: n + 1 }, (_, c) => (c > 0 && c < n ? tab() : null))),
  };
  // 凸耳靠角落時，同一片相鄰兩邊的凸耳可能擠在一起：靠太近就把離中間較遠的那個往中間拉、縮小一點
  for (let pass = 0; pass < 40; pass++) {
    const fix = crowded(n, shape);
    if (!fix.length) break;
    for (const t of fix) {
      t.at = 0.5 + (t.at - 0.5) * 0.7;
      t.tall *= 0.94;
      t.wide = Math.min(t.wide, 1);
    }
  }
  return shape;
}

// 同一片任兩條邊最少要隔多遠（單位）；相鄰兩邊在共用的角點附近本來就相接，不算
const GAP = 6;
const CORNER = 14;

/** 三次貝茲曲線的點串取樣成折線 */
function sample(points) {
  const out = [];
  for (let k = 0; k + 3 < points.length; k += 3) {
    const [p0, p1, p2, p3] = points.slice(k, k + 4);
    for (let s = 0; s < 8; s++) {
      const t = s / 8, u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      out.push([0, 1].map((j) => w[0] * p0[j] + w[1] * p1[j] + w[2] * p2[j] + w[3] * p3[j]));
    }
  }
  out.push(points.at(-1));
  return out;
}

/** 擠在一起的凸耳：回傳該往中間拉的那些（每對挑離中間較遠的那個）；全部分得開就是空陣列 */
export function crowded(n, shape) {
  const { h, v } = shape;
  const found = new Set();
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    const owners = [h[r][c], v[r][c + 1], h[r + 1][c], v[r][c]];
    const lines = pieceEdges(n, shape, i).map(sample);
    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) {
        if (!owners[a] && !owners[b]) continue;
        // 相鄰兩邊共用的角點：a 的終點接 b 的起點（或反過來）
        const corner = b === a + 1 ? lines[a].at(-1) : b - a === 3 ? lines[b].at(-1) : null;
        const far = (p) => !corner || Math.hypot(p[0] - corner[0], p[1] - corner[1]) > CORNER;
        const pa = lines[a].filter(far), pb = lines[b].filter(far);
        const close = pa.some((p) => pb.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < GAP));
        if (!close) continue;
        const pick = [owners[a], owners[b]].filter(Boolean).sort((x, y) => Math.abs(y.at - 0.5) - Math.abs(x.at - 0.5) || y.tall - x.tall)[0];
        found.add(pick);
      }
    }
  }
  return [...found];
}

const f1 = (v) => +v.toFixed(1);

// 標準凸耳的輪廓：沿著接縫的位置 t（0–1，中心 0.5）和往外凸的高度 k（以 100 單位為 1）；
// 第一點之後每三點是一段三次貝茲曲線
const NECK = [
  [0.36, 0], [0.42, 0], [0.4, 0.1], [0.37, 0.14], [0.32, 0.22], [0.4, 0.3], [0.5, 0.3],
  [0.6, 0.3], [0.68, 0.22], [0.63, 0.14], [0.6, 0.1], [0.58, 0], [0.64, 0],
];

/**
 * 一條接縫從 a 走到 b 的點：[起點, 控制點, 控制點, 終點, 控制點, 控制點, 終點, …]，全部是三次貝茲曲線。
 * 反方向走同一條接縫，就是把這串點倒過來，兩片的接縫因此一模一樣。
 */
function seam(a, b, tab) {
  if (!tab) return [a, a, b, b];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  // 往左手邊的法線（橫線由左往右走時是往上），乘上 dir 決定凸哪一邊
  const nx = (dy / len) * tab.dir, ny = (-dx / len) * tab.dir;
  const at = (t, k) => {
    const off = k * UNIT + tab.bend * len * Math.sin(Math.PI * t);
    return [a[0] + dx * t + nx * off, a[1] + dy * t + ny * off];
  };
  const shape = NECK.map(([t, k]) => [tab.at + (t - 0.5) * tab.wide + tab.lean * k, k * tab.tall]);
  const s = shape[0][0], e = shape.at(-1)[0];
  // 凸耳前後兩段直線也帶著彎度：各切成一段曲線
  return [
    a, at(s / 3, 0), at((2 * s) / 3, 0),
    ...shape.map(([t, k]) => at(t, k)),
    at(e + (1 - e) / 3, 0), at(e + (2 * (1 - e)) / 3, 0), b,
  ];
}

/** 第 i 片（由左上往右、一列一列數）的四條邊，順時針：上、右、下、左，每條是 seam() 的點串 */
export function pieceEdges(n, shape, i) {
  const r = Math.floor(i / n), c = i % n;
  const { pts, h, v } = shape;
  const tl = pts[r][c], tr = pts[r][c + 1], br = pts[r + 1][c + 1], bl = pts[r + 1][c];
  return [
    seam(tl, tr, h[r][c]),
    seam(tr, br, v[r][c + 1] && { ...v[r][c + 1], dir: -v[r][c + 1].dir }),
    seam(bl, br, h[r + 1][c]).reverse(),
    seam(tl, bl, v[r][c] && { ...v[r][c], dir: -v[r][c].dir }).reverse(),
  ];
}

/** 第 i 片的 SVG 路徑 */
export function piecePath(n, shape, i) {
  const edges = pieceEdges(n, shape, i);
  const pt = ([x, y]) => `${f1(x)} ${f1(y)}`;
  let d = `M${pt(edges[0][0])}`;
  for (const e of edges) {
    for (let k = 1; k < e.length; k += 3) d += `C${pt(e[k])} ${pt(e[k + 1])} ${pt(e[k + 2])}`;
  }
  return `${d}Z`;
}

/** 第 i 片四個角點的中心，放編號用 */
export function pieceCenter(n, shape, i) {
  const r = Math.floor(i / n), c = i % n;
  const { pts } = shape;
  const four = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
  return [four.reduce((s, p) => s + p[0], 0) / 4, four.reduce((s, p) => s + p[1], 0) / 4];
}

/** 第 i 片的外框（含凸耳，貝茲曲線不會超出控制點） */
export function pieceBox(n, shape, i) {
  const all = pieceEdges(n, shape, i).flat();
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
