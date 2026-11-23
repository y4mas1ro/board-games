import type { ReversiState } from "../games/reversi/types";

/** E2E テスト用に現在の画面と状態を公開する（読み取り専用） */
export interface ReversiDebug {
  scene: "title" | "game" | "result";
  getState?: () => ReversiState;
  isBusy?: () => boolean;
  /** 人間の手番で置けるマス（index） */
  humanMoves?: () => number[];
}

declare global {
  interface Window {
    __REVERSI__?: ReversiDebug;
  }
}

export function setDebug(debug: ReversiDebug): void {
  window.__REVERSI__ = debug;
}
