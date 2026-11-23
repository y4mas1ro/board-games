/**
 * シード付き疑似乱数（mulberry32）。リプレイやテストを再現可能にするために使う。
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 以上 max 未満の整数 */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick: 空の配列からは選べません");
  return items[randomInt(rng, items.length)] as T;
}
