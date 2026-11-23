import type { FourState } from "../games/four-in-a-row/types";

/** E2E テスト用に現在の画面と状態を公開する（読み取り専用） */
export interface FourDebug {
  scene: "title" | "game" | "result";
  getState?: () => FourState;
  isBusy?: () => boolean;
  /** 人間の手番で落とせる列 */
  humanMoves?: () => number[];
}

declare global {
  interface Window {
    __FOUR__?: FourDebug;
  }
}

export function setDebug(debug: FourDebug): void {
  window.__FOUR__ = debug;
}
