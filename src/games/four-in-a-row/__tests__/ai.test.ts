import { describe, expect, it } from "vitest";
import type { CpuLevel } from "../../../ai/types";
import { createRng } from "../../../core/random";
import { chooseFourMove } from "../ai";
import { parseBoard } from "../board";
import { fourInARow } from "../rules";
import { RED, YELLOW, type FourState } from "../types";

const at = (board: string, turn: 1 | 2, moveNumber: number): FourState => ({
  board: parseBoard(board),
  turn,
  moveNumber,
  winLine: null,
});

// 赤が 4 列目（index 3）に落とせば横に 4 つ並ぶ
const redCanWin = at(
  `
  .......
  .......
  .......
  .......
  YYY....
  RRR....
`,
  RED,
  6,
);

// 黄の番。赤の 4 つ目（列 3）を止めないと負ける
const yellowMustBlock = at(
  `
  .......
  .......
  .......
  .......
  .Y.....
  RRR..Y.
`,
  YELLOW,
  5,
);

function playGame(red: CpuLevel, yellow: CpuLevel, seed: number): 0 | 1 | null {
  const rng = createRng(seed);
  let state = fourInARow.setup({ players: 2 });
  for (;;) {
    const player = fourInARow.currentPlayer(state);
    if (player === null) break;
    const move = chooseFourMove(state, player === 0 ? red : yellow, rng, {
      maxDepth: 6,
      timeLimitMs: 10_000,
    });
    state = fourInARow.applyMove(state, move).state;
  }
  const result = fourInARow.result(state)!;
  return result.kind === "win" ? (result.winner as 0 | 1) : null;
}

describe("四目並べの CPU", () => {
  for (const level of ["weak", "medium", "strong"] as const) {
    it(`${level}: 勝てる手があれば必ず打つ`, () => {
      const move = chooseFourMove(redCanWin, level, createRng(1), { maxDepth: 4 });
      expect(move).toEqual({ column: 3 });
    });

    it(`${level}: 合法手を返す`, () => {
      const state = fourInARow.setup({ players: 2 });
      const move = chooseFourMove(state, level, createRng(2), { maxDepth: 4 });
      expect(fourInARow.legalMoves(state).some((m) => fourInARow.isSameMove(m, move))).toBe(true);
    });
  }

  for (const level of ["medium", "strong"] as const) {
    it(`${level}: 相手の 4 つ目を止める`, () => {
      const move = chooseFourMove(yellowMustBlock, level, createRng(3), { maxDepth: 4 });
      expect(move).toEqual({ column: 3 });
    });
  }

  it("中は弱にほぼ勝ち越す", () => {
    let wins = 0;
    for (let seed = 0; seed < 10; seed++) {
      if (playGame("medium", "weak", seed) === 0) wins++;
      if (playGame("weak", "medium", seed + 100) === 1) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(18);
  });
});
