import { describe, expect, it } from "vitest";
import type { GameDefinition } from "../core/game";
import { searchBestMove } from "./alphabeta";

/**
 * 石取りゲーム（ニム）: 山から 1〜3 個取り、最後の 1 個を取った方が勝ち。
 * 山の数が 4 の倍数でない局面では、4 の倍数を残す手が必勝。
 */
interface NimState {
  stones: number;
  turn: 0 | 1;
  lastMover: 0 | 1 | null;
}
const nim: GameDefinition<NimState, number> = {
  id: "nim",
  setup: () => ({ stones: 10, turn: 0, lastMover: null }),
  currentPlayer: (s) => (s.stones === 0 ? null : s.turn),
  legalMoves: (s) => [1, 2, 3].filter((n) => n <= s.stones),
  applyMove: (s, n) => ({
    state: { stones: s.stones - n, turn: s.turn === 0 ? 1 : 0, lastMover: s.turn },
    events: [],
  }),
  result: (s) => (s.stones === 0 ? { kind: "win", winner: s.lastMover ?? 0 } : null),
  isSameMove: (a, b) => a === b,
};
const evaluate = (s: NimState, player: number) =>
  s.stones === 0 ? (s.lastMover === player ? 1 : -1) : 0;

describe("searchBestMove", () => {
  it.each([
    [10, 2],
    [7, 3],
    [5, 1],
  ])("山が %i 個なら %i 個取るのが最善", (stones, expected) => {
    const result = searchBestMove(nim, { stones, turn: 0, lastMover: null }, evaluate, {
      maxDepth: 20,
    });
    expect(result.move).toBe(expected);
    expect(result.score).toBe(1);
  });

  it("終局まで読み切ったら深さ上限より手前で止まる", () => {
    const result = searchBestMove(nim, { stones: 3, turn: 0, lastMover: null }, evaluate, {
      maxDepth: 50,
    });
    expect(result.depth).toBeLessThan(5);
  });

  it("時間切れでも 1 手目までの結果は返す", () => {
    let t = 0;
    const result = searchBestMove(nim, { stones: 30, turn: 0, lastMover: null }, evaluate, {
      maxDepth: 50,
      timeLimitMs: 5,
      now: () => (t += 1),
    });
    expect([1, 2, 3]).toContain(result.move);
  });
});
