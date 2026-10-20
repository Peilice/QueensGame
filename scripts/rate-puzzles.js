// 難度評分：照人解題的方式一步一步推，每一步挑最簡單能推進的招式，招式越難分數越高。
// 用來替新題排序（scripts/add-puzzles.js），也可以直接跑：node scripts/rate-puzzles.js 印出整個題庫的分數。
import { parsePuzzle } from '../src/rules.js';
import { PUZZLES } from '../src/puzzles.js';
import { pathToFileURL } from 'node:url';

// 每一招用一次的分數：
// 1 某色塊只落在一列（一欄），或某列只落在一個色塊裡 → 消掉同列（同欄、同色塊）的其他格
// 2、3 兩個、三個色塊剛好占滿兩列、三列（或反過來）
// 4 更多個色塊占滿同樣多列
// 5 假設放在某格，順著推下去會有一列、一欄或一個色塊沒地方放 → 那格標 ✕
const COST = [0, 1, 2, 4, 6, 12];

function setup(rows) {
  const { size, regions } = parsePuzzle(rows);
  const line = (f) => [...Array(size).keys()].map((k) => f(k));
  const rowCells = line((r) => line((c) => r * size + c));
  const colCells = line((c) => line((r) => r * size + c));
  const regionCells = line((id) => regions.flatMap((x, i) => (x === id ? [i] : [])));
  const reach = (i) => {
    const r = Math.floor(i / size), c = i % size;
    return regions.flatMap((x, j) => {
      const rr = Math.floor(j / size), cc = j % size;
      const hit = rr === r || cc === c || x === regions[i] || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1);
      return j !== i && hit ? [j] : [];
    });
  };
  return {
    size,
    regions,
    rowCells,
    colCells,
    regionCells,
    groups: [...rowCells, ...colCells, ...regionCells],
    reach: [...Array(size * size).keys()].map(reach),
  };
}

const fresh = (P) => ({ open: new Uint8Array(P.size * P.size).fill(1), queen: new Uint8Array(P.size * P.size) });
const copy = (st) => ({ open: st.open.slice(), queen: st.queen.slice() });
const finished = (P, st) => st.queen.reduce((a, b) => a + b, 0) === P.size;

function place(P, st, i) {
  st.queen[i] = 1;
  st.open[i] = 0;
  for (const j of P.reach[i]) st.open[j] = 0;
}

/** 某一列、欄或色塊只剩一格就放下去；推到不能再推，有一組沒地方放回傳 false */
function settle(P, st) {
  for (let changed = true; changed; ) {
    changed = false;
    for (const g of P.groups) {
      if (g.some((i) => st.queen[i])) continue;
      const left = g.filter((i) => st.open[i]);
      if (left.length === 0) return false;
      if (left.length === 1) {
        place(P, st, left[0]);
        changed = true;
      }
    }
  }
  return true;
}

/** k 組（例如 k 個色塊）的空格剛好落在另 k 組（例如 k 列）裡 → 那 k 列的其他格消掉；有消到回傳 true */
function cover(P, st, k) {
  const { size, regions, rowCells, colCells, regionCells } = P;
  const rowOf = (i) => Math.floor(i / size), colOf = (i) => i % size, regionOf = (i) => regions[i];
  const pairs = [
    [regionCells, rowOf, rowCells],
    [regionCells, colOf, colCells],
    [rowCells, regionOf, regionCells],
    [colCells, regionOf, regionCells],
    [rowCells, colOf, colCells],
    [colCells, rowOf, rowCells],
  ];
  for (const [from, key, to] of pairs) {
    const live = from
      .filter((g) => !g.some((i) => st.queen[i]))
      .map((g) => g.filter((i) => st.open[i]));
    const pick = (start, chosen) => {
      if (chosen.length === k) {
        const inside = new Set(chosen.flat());
        const keys = new Set([...inside].map(key));
        if (keys.size !== k) return false;
        let hit = false;
        for (const t of keys) {
          for (const i of to[t]) {
            if (st.open[i] && !inside.has(i)) {
              st.open[i] = 0;
              hit = true;
            }
          }
        }
        return hit;
      }
      for (let n = start; n < live.length; n++) if (pick(n + 1, [...chosen, live[n]])) return true;
      return false;
    };
    if (pick(0, [])) return true;
  }
  return false;
}

/** 假設放在某格，順著只剩一格的推下去會卡死 → 那格標 ✕；有消到回傳 true */
function suppose(P, st) {
  for (let i = 0; i < P.size * P.size; i++) {
    if (!st.open[i]) continue;
    const t = copy(st);
    place(P, t, i);
    if (!settle(P, t)) {
      st.open[i] = 0;
      return true;
    }
  }
  return false;
}

/** 回傳 { level: 用到最難的招, score: 每步分數加總 }；這幾招推不完回傳 null */
export function rate(rows) {
  const P = setup(rows);
  const st = fresh(P);
  let level = 0, score = 0;
  const use = (n) => {
    level = Math.max(level, n);
    score += COST[n];
  };
  for (;;) {
    if (!settle(P, st)) return null;
    if (finished(P, st)) return { level, score };
    if (cover(P, st, 1)) use(1);
    else if (cover(P, st, 2)) use(2);
    else if (cover(P, st, 3)) use(3);
    else if ([...Array(P.size - 4).keys()].some((n) => cover(P, st, n + 4))) use(4);
    else if (suppose(P, st)) use(5);
    else return null;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [size, list] of Object.entries(PUZZLES)) {
    console.log(`${size}×${size}：${list.map((rows) => rate(rows)?.score ?? '?').join(' ')}`);
  }
}
