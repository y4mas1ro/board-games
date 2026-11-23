import type { GameDefinition } from "../core/game";
import { pick, type Rng } from "../core/random";

/** 合法手からランダムに 1 つ選ぶ */
export function randomMove<S, M, E>(game: GameDefinition<S, M, E>, state: S, rng: Rng): M {
  return pick(rng, game.legalMoves(state));
}
