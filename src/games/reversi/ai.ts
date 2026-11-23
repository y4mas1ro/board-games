import { searchBestMove } from "../../ai/alphabeta";
import { greedyMove } from "../../ai/greedy";
import { randomMove } from "../../ai/random-player";
import type { Rng } from "../../core/random";
import { countDiscs } from "./board";
import { evaluateFull, evaluatePosition } from "./evaluate";
import { reversi } from "./rules";
import type { ReversiMove, ReversiState } from "./types";

export type CpuLevel = "weak" | "medium" | "strong";

export const CPU_LEVEL_LABELS: Record<CpuLevel, string> = {
  weak: "弱",
  medium: "中",
  strong: "強",
};

export interface CpuOptions {
  /** 「強」の思考時間（ミリ秒） */
  timeLimitMs?: number;
  /** 「強」の最大の読みの深さ（テストで短くするため） */
  maxDepth?: number;
  signal?: AbortSignal;
}

/** 終盤この空きマス数以下なら終局まで読み切りを試みる */
const ENDGAME_EMPTIES = 12;

/**
 * 難易度ごとの手の選び方（docs/design.md 5章）
 * - 弱: ランダム
 * - 中: 1 手読み + 位置評価
 * - 強: αβ探索（反復深化・時間制限）+ 位置評価・着手可能数・石数
 */
export function chooseReversiMove(
  state: ReversiState,
  level: CpuLevel,
  rng: Rng,
  options: CpuOptions = {},
): ReversiMove {
  switch (level) {
    case "weak":
      return randomMove(reversi, state, rng);
    case "medium":
      return greedyMove(reversi, state, evaluatePosition, rng);
    case "strong": {
      const moves = reversi.legalMoves(state);
      if (moves.length === 1) return moves[0] as ReversiMove;
      const { empty } = countDiscs(state.board);
      const endgame = empty <= ENDGAME_EMPTIES;
      return searchBestMove(reversi, state, evaluateFull, {
        maxDepth: options.maxDepth ?? (endgame ? empty + 2 : 64),
        timeLimitMs: options.timeLimitMs ?? (endgame ? 2500 : 800),
        ...(options.signal ? { signal: options.signal } : {}),
      }).move;
    }
  }
}
