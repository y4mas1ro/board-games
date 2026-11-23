import type { PlayerId } from "../core/game";

/** player から見た局面の良さ。大きいほど player に有利 */
export type Evaluator<S> = (state: S, player: PlayerId) => number;

/** CPU の強さ（全ゲーム共通） */
export type CpuLevel = "weak" | "medium" | "strong";

export const CPU_LEVEL_LABELS: Record<CpuLevel, string> = {
  weak: "弱",
  medium: "中",
  strong: "強",
};
