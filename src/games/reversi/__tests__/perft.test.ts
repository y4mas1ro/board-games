import { describe, expect, it } from "vitest";
import { createInitialState, reversi } from "../rules";
import type { ReversiState } from "../types";

/** 深さ depth までの全手順（葉）の数。パスも 1 手として数え、途中で終局した手順は数えない */
function perft(state: ReversiState, depth: number): number {
  if (depth === 0) return 1;
  let total = 0;
  for (const move of reversi.legalMoves(state)) {
    total += perft(reversi.applyMove(state, move).state, depth - 1);
  }
  return total;
}

describe("perft（初期局面からの手順数）", () => {
  // 公開されているオセロの perft 値
  const expected = [1, 4, 12, 56, 244, 1396, 8200, 55092];
  for (const [depth, count] of expected.entries()) {
    it(`深さ ${depth}: ${count}`, () => {
      expect(perft(createInitialState(), depth)).toBe(count);
    });
  }
});
