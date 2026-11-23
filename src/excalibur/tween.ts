import type { Scene } from "excalibur";

/**
 * 実時間（performance.now）で進むアニメーション。
 * Excalibur の内部時計は 1 フレームが 200ms を超えると時間を進めないため、
 * 描画が重い端末でも対局の進行が止まらないよう、手の進行に関わる演出はこちらを使う。
 */
export function tween(
  scene: Scene,
  durationMs: number,
  update: (t: number) => void,
  easing: (t: number) => number = (t) => t,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      update(easing(t));
      if (t >= 1) {
        sub.close();
        resolve();
      }
    };
    const sub = scene.on("preupdate", step);
    step();
  });
}

/** 実時間で ms ミリ秒待つ */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
