import type { PlayerId } from "../core/game";

/** player から見た局面の良さ。大きいほど player に有利 */
export type Evaluator<S> = (state: S, player: PlayerId) => number;
