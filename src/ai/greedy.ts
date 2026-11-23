import type { GameDefinition } from "../core/game";
import { pick, type Rng } from "../core/random";
import type { Evaluator } from "./types";

/** 1 手だけ読み、評価値が最大になる手を選ぶ（同点はランダム） */
export function greedyMove<S, M, E>(
  game: GameDefinition<S, M, E>,
  state: S,
  evaluate: Evaluator<S>,
  rng: Rng,
): M {
  const player = game.currentPlayer(state);
  const moves = game.legalMoves(state);
  if (player === null || moves.length === 0) throw new Error("終局しているため手を選べません");
  let best: M[] = [];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = evaluate(game.applyMove(state, move).state, player);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return pick(rng, best);
}
