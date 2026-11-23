import type { FourMove, FourState } from "../games/four-in-a-row/types";
import type { ReversiMove, ReversiState } from "../games/reversi/types";
import type { CpuLevel } from "./types";

/** Worker で思考できるゲームと、その状態・手の型 */
export interface WorkerGames {
  reversi: { state: ReversiState; move: ReversiMove };
  "four-in-a-row": { state: FourState; move: FourMove };
}

export type WorkerGameId = keyof WorkerGames;

export type ThinkRequest = {
  [G in WorkerGameId]: {
    id: number;
    gameId: G;
    state: WorkerGames[G]["state"];
    level: CpuLevel;
    seed: number;
  };
}[WorkerGameId];

export type ThinkResponse =
  { id: number; move: WorkerGames[WorkerGameId]["move"] } | { id: number; error: string };
