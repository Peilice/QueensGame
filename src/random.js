// 可重現的亂數：同一個種子永遠得到同一串數字。隨機出題（generator.js）和拼圖形狀（jigsaw.js）共用。

/** mulberry32：小而快的種子亂數，回傳 [0, 1) */
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
