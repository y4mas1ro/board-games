import type { PlayerId } from "../../core/game";
import { CELL_COUNT, countDiscs, placeableIndices } from "./board";
import { isTerminal, playerToDisc } from "./rules";
import { EMPTY, type ReversiState } from "./types";
import { opponent } from "./board";

/**
 * 位置評価表。角は高く、角の隣（C・X 打ち）は低い。
 * 角がすでに埋まっている場合、隣のマスの減点は無効にする。
 */
// prettier-ignore
export const POSITION_WEIGHTS: readonly number[] = [
  100, -20, 10,  5,  5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
   10,  -2,  1,  1,  1,  1,  -2,  10,
    5,  -2,  1,  0,  0,  1,  -2,   5,
    5,  -2,  1,  0,  0,  1,  -2,   5,
   10,  -2,  1,  1,  1,  1,  -2,  10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10,  5,  5, 10, -20, 100,
];

/** 角 → その角に隣接する C・X マス */
const CORNER_NEIGHBORS: readonly (readonly [number, readonly number[]])[] = [
  [0, [1, 8, 9]],
  [7, [6, 15, 14]],
  [56, [57, 48, 49]],
  [63, [62, 55, 54]],
];

const WIN_SCORE = 100000;

/** 終局時の評価（石差を大きな値にする） */
function terminalScore(state: ReversiState, player: PlayerId): number {
  const { black, white } = countDiscs(state.board);
  const diff = player === 0 ? black - white : white - black;
  if (diff === 0) return 0;
  return Math.sign(diff) * WIN_SCORE + diff;
}

/** 位置評価のみ（「中」の CPU が使う） */
export function evaluatePosition(state: ReversiState, player: PlayerId): number {
  if (isTerminal(state)) return terminalScore(state, player);
  const me = playerToDisc(player);
  let score = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = state.board[i];
    if (cell === EMPTY) continue;
    const w = POSITION_WEIGHTS[i] as number;
    score += cell === me ? w : -w;
  }
  // 角が埋まっていれば、その周りの減点を取り消す
  for (const [corner, neighbors] of CORNER_NEIGHBORS) {
    if (state.board[corner] === EMPTY) continue;
    for (const n of neighbors) {
      const cell = state.board[n];
      if (cell === EMPTY) continue;
      const w = POSITION_WEIGHTS[n] as number;
      score -= cell === me ? w : -w;
    }
  }
  return score;
}

/** 位置評価 + 着手可能数 + 終盤の石数（「強」の CPU が使う） */
export function evaluateFull(state: ReversiState, player: PlayerId): number {
  if (isTerminal(state)) return terminalScore(state, player);
  const me = playerToDisc(player);
  const opp = opponent(me);
  const position = evaluatePosition(state, player);
  const mobility =
    placeableIndices(state.board, me).length - placeableIndices(state.board, opp).length;
  const { black, white, empty } = countDiscs(state.board);
  const discDiff = me === 1 ? black - white : white - black;
  // 序盤は石が少ない方が有利なことが多いので、石数は終盤だけ重視する
  const discWeight = empty <= 16 ? 2 : 0;
  return position + mobility * 8 + discDiff * discWeight;
}
