import { describe, expect, it } from "vitest";
import { createRng, pick, randomInt } from "./random";

describe("createRng", () => {
  it("同じシードなら同じ乱数列になる", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("0 以上 1 未満を返す", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randomInt と pick は範囲内を返す", () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      expect(randomInt(rng, 5)).toBeLessThan(5);
      expect(["a", "b"]).toContain(pick(rng, ["a", "b"]));
    }
    expect(() => pick(rng, [])).toThrow();
  });
});
