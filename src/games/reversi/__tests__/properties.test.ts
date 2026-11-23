import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { countDiscs } from "../board";
import { createInitialState, reversi } from "../rules";

/** 選択肢の列にしたがって、終局するまで合法手を打ち続ける */
function playOut(choices: readonly number[]) {
  let state = createInitialState();
  let placed = 0;
  let steps = 0;
  for (;;) {
    const moves = reversi.legalMoves(state);
    if (moves.length === 0) break;
    const move = moves[(choices[steps % choices.length] ?? 0) % moves.length]!;
    if (move.type === "place") placed++;
    state = reversi.applyMove(state, move).state;
    steps++;
    // 盤面の不変条件
    const { black, white, empty } = countDiscs(state.board);
    expect(black + white).toBe(4 + placed);
    expect(black + white + empty).toBe(64);
    expect(state.board.every((c) => c === 0 || c === 1 || c === 2)).toBe(true);
    expect(steps).toBeLessThan(200);
  }
  return { state, placed, steps };
}

describe("ランダムな対局での不変条件", () => {
  it("石の総数は 4 + 置いた回数、必ず終局し、結果が出る", () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 1, maxLength: 80 }), (choices) => {
        const { state, placed } = playOut(choices);
        expect(placed).toBeLessThanOrEqual(60);
        const result = reversi.result(state);
        expect(result).not.toBeNull();
        expect(reversi.currentPlayer(state)).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  it("パスは他に合法手が無いときだけ現れる", () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 1, maxLength: 80 }), (choices) => {
        let state = createInitialState();
        for (let i = 0; i < 100; i++) {
          const moves = reversi.legalMoves(state);
          if (moves.length === 0) break;
          if (moves.some((m) => m.type === "pass")) expect(moves).toHaveLength(1);
          state = reversi.applyMove(
            state,
            moves[(choices[i % choices.length] ?? 0) % moves.length]!,
          ).state;
        }
      }),
      { numRuns: 100 },
    );
  });
});
