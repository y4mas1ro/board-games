import type { PlayerId } from "../../core/game";
import { CELL_COUNT, COLS, CONNECT, ROWS, opponent, toIndex } from "./board";
import { pieceToPlayer } from "./rules";
import type { FourState, Piece } from "./types";

/** 勝ちの評価値。早く勝つほど（遅く負けるほど）良い */
export const WIN_SCORE = 1_000_000;

/** 4 マスの並び（窓）を全部列挙しておく */
const WINDOWS: readonly (readonly number[])[] = (() => {
  const windows: number[][] = [];
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ] as const;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + dr * (CONNECT - 1);
        const endCol = col + dc * (CONNECT - 1);
        if (endRow < 0 || endRow >= ROWS || endCol >= COLS) continue;
        windows.push(
          Array.from({ length: CONNECT }, (_, k) => toIndex(row + dr * k, col + dc * k)),
        );
      }
    }
  }
  return windows;
})();

/** 窓の中に自分の駒だけが n 個あるときの点数 */
const WINDOW_SCORES = [0, 1, 6, 40] as const;
const CENTER_BONUS = 4;

/** player から見た局面の良さ */
export function evaluateFour(state: FourState, player: PlayerId): number {
  if (state.winLine) {
    const winner = pieceToPlayer(opponent(state.turn));
    const score = WIN_SCORE - state.moveNumber;
    return winner === player ? score : -score;
  }
  if (state.moveNumber >= CELL_COUNT) return 0;

  const me: Piece = player === 0 ? 1 : 2;
  const { board } = state;
  let score = 0;
  for (const window of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (const i of window) {
      const cell = board[i];
      if (cell === me) mine++;
      else if (cell !== 0) theirs++;
    }
    if (mine > 0 && theirs === 0) score += WINDOW_SCORES[mine as 1 | 2 | 3];
    else if (theirs > 0 && mine === 0) score -= WINDOW_SCORES[theirs as 1 | 2 | 3];
  }
  // 中央の列は多くの並びに関わるので価値が高い
  const center = Math.floor(COLS / 2);
  for (let row = 0; row < ROWS; row++) {
    const cell = board[toIndex(row, center)];
    if (cell === me) score += CENTER_BONUS;
    else if (cell !== 0) score -= CENTER_BONUS;
  }
  return score;
}
