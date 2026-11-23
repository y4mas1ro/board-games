import type { PlayerController } from "./game-session";

export const humanController = <S, M>(): PlayerController<S, M> => ({ kind: "human" });

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/**
 * CPU プレイヤー。think の結果が早く返っても minDelayMs までは待つ
 * （人間が手の流れを追えるようにするため）。
 */
export function cpuController<S, M>(
  think: (state: S, signal: AbortSignal) => Promise<M>,
  minDelayMs = 0,
): PlayerController<S, M> {
  return {
    kind: "cpu",
    async requestMove(state, signal) {
      const [move] = await Promise.all([think(state, signal), delay(minDelayMs, signal)]);
      return move;
    },
  };
}
