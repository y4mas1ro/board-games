import { searchBestMove } from "../../ai/alphabeta";
import { randomMove } from "../../ai/random-player";
import type { CpuLevel } from "../../ai/types";
import type { Rng } from "../../core/random";
import { evaluateFour } from "./evaluate";
import { fourInARow } from "./rules";
import type { FourMove, FourState } from "./types";

export interface FourCpuOptions {
  /** 「強」の思考時間（ミリ秒） */
  timeLimitMs?: number;
  /** 「強」の最大の読みの深さ（テストで短くするため） */
  maxDepth?: number;
  signal?: AbortSignal;
}

/** 「中」の読みの深さ */
const MEDIUM_DEPTH = 4;

/** すぐに 4 つ並べられる手があれば返す */
export function findWinningMove(state: FourState): FourMove | null {
  for (const move of fourInARow.legalMoves(state)) {
    if (fourInARow.applyMove(state, move).state.winLine) return move;
  }
  return null;
}

/**
 * 難易度ごとの手の選び方
 * - 弱: 勝てる手があれば打ち、それ以外はランダム
 * - 中: αβ探索 4 手読み
 * - 強: αβ探索（反復深化・時間制限）
 */
export function chooseFourMove(
  state: FourState,
  level: CpuLevel,
  rng: Rng,
  options: FourCpuOptions = {},
): FourMove {
  switch (level) {
    case "weak":
      return findWinningMove(state) ?? randomMove(fourInARow, state, rng);
    case "medium":
      return searchBestMove(fourInARow, state, evaluateFour, { maxDepth: MEDIUM_DEPTH }).move;
    case "strong": {
      const moves = fourInARow.legalMoves(state);
      if (moves.length === 1) return moves[0] as FourMove;
      return searchBestMove(fourInARow, state, evaluateFour, {
        maxDepth: options.maxDepth ?? 42,
        timeLimitMs: options.timeLimitMs ?? 1000,
        ...(options.signal ? { signal: options.signal } : {}),
      }).move;
    }
  }
}
