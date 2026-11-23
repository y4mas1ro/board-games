import type { CpuLevel } from "../games/reversi/ai";
import type { ReversiMove, ReversiState } from "../games/reversi/types";

export interface ThinkRequest {
  id: number;
  gameId: "reversi";
  state: ReversiState;
  level: CpuLevel;
  seed: number;
}

export type ThinkResponse = { id: number; move: ReversiMove } | { id: number; error: string };
