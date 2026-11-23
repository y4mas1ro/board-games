import { createRng } from "../core/random";
import { chooseFourMove } from "../games/four-in-a-row/ai";
import { chooseReversiMove } from "../games/reversi/ai";
import type { ThinkRequest, WorkerGameId, WorkerGames } from "./worker-protocol";

/** ゲームごとに CPU の手を選ぶ（Worker の中、または Worker が使えない環境で呼ぶ） */
export function thinkMove<G extends WorkerGameId>(
  request: Extract<ThinkRequest, { gameId: G }>,
): WorkerGames[G]["move"];
export function thinkMove(request: ThinkRequest): WorkerGames[WorkerGameId]["move"] {
  const rng = createRng(request.seed);
  switch (request.gameId) {
    case "reversi":
      return chooseReversiMove(request.state, request.level, rng);
    case "four-in-a-row":
      return chooseFourMove(request.state, request.level, rng);
  }
}
