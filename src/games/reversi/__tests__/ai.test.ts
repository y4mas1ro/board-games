import { describe, expect, it } from "vitest";
import { createRng } from "../../../core/random";
import { chooseReversiMove, type CpuLevel } from "../ai";
import { fromNotation, parseBoard } from "../board";
import { createInitialState, reversi } from "../rules";
import { BLACK, type ReversiState } from "../types";

// 黒が a1 の角を取れる局面（d4 の白を挟める）
const cornerAvailable: ReversiState = {
  board: parseBoard(`
    ........
    .W......
    ..W.....
    ...B....
    ........
    ........
    ........
    ........
  `),
  turn: BLACK,
  moveNumber: 10,
};

/** 黒番・白番それぞれの CPU で 1 局打ち、黒（プレイヤー 0）から見た石差を返す */
function playGame(black: CpuLevel, white: CpuLevel, seed: number, maxDepth = 3): number {
  const rng = createRng(seed);
  let state = createInitialState();
  for (;;) {
    const player = reversi.currentPlayer(state);
    if (player === null) break;
    const level = player === 0 ? black : white;
    const move = chooseReversiMove(state, level, rng, { maxDepth, timeLimitMs: 10_000 });
    state = reversi.applyMove(state, move).state;
  }
  const result = reversi.result(state)!;
  const [b, w] = result.scores as [number, number];
  return b - w;
}

describe("CPU", () => {
  it.each<CpuLevel>(["weak", "medium", "strong"])("%s は必ず合法手を返す", (level) => {
    const state = createInitialState();
    const move = chooseReversiMove(state, level, createRng(1), { maxDepth: 3 });
    expect(reversi.legalMoves(state).some((m) => reversi.isSameMove(m, move))).toBe(true);
  });

  it.each<CpuLevel>(["medium", "strong"])("%s は角が取れるなら角を取る", (level) => {
    const move = chooseReversiMove(cornerAvailable, level, createRng(1), { maxDepth: 3 });
    expect(move).toEqual({ type: "place", index: fromNotation("a1") });
  });

  it("中は弱にほとんど勝つ（20 局中 15 勝以上）", () => {
    let wins = 0;
    for (let i = 0; i < 20; i++) {
      const diff = i % 2 === 0 ? playGame("medium", "weak", i) : -playGame("weak", "medium", i);
      if (diff > 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(15);
  });

  it("強は中に勝ち越す（10 局中 7 勝以上）", () => {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const diff = i % 2 === 0 ? playGame("strong", "medium", i) : -playGame("medium", "strong", i);
      if (diff > 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(7);
  }, 60_000);

  it("強は終盤（残り 8 マス）を読み切り、全探索と同じ最善の石差を選ぶ", () => {
    const state: ReversiState = {
      board: parseBoard(`
        WWWW....
        WWWWBB..
        BBWWBBBB
        BBBWWBBB
        BBWBWWBB
        BBBWBBWB
        BBBBBBBW
        BBBBBBBB
      `),
      turn: BLACK,
      moveNumber: 52,
    };
    // 全探索: 黒から見た最終石差
    const exact = (s: ReversiState): number => {
      const player = reversi.currentPlayer(s);
      if (player === null) {
        const [b, w] = reversi.result(s)!.scores as [number, number];
        return b - w;
      }
      const values = reversi.legalMoves(s).map((m) => exact(reversi.applyMove(s, m).state));
      return player === 0 ? Math.max(...values) : Math.min(...values);
    };
    const best = Math.max(
      ...reversi.legalMoves(state).map((m) => exact(reversi.applyMove(state, m).state)),
    );
    const move = chooseReversiMove(state, "strong", createRng(1));
    expect(exact(reversi.applyMove(state, move).state)).toBe(best);
  }, 30_000);
});
