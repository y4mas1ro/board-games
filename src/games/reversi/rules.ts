import type { GameDefinition, GameResult, MoveResult, PlayerId } from "../../core/game";
import { IllegalMoveError } from "../../core/errors";
import {
  CELL_COUNT,
  countDiscs,
  findFlips,
  hasPlaceable,
  initialBoard,
  opponent,
  placeableIndices,
  toNotation,
} from "./board";
import {
  BLACK,
  type Cell,
  type Disc,
  type ReversiEvent,
  type ReversiMove,
  type ReversiState,
} from "./types";

/** 黒 = プレイヤー 0、白 = プレイヤー 1 */
export const discToPlayer = (disc: Disc): PlayerId => (disc === BLACK ? 0 : 1);
export const playerToDisc = (player: PlayerId): Disc => (player === 0 ? BLACK : 2);

export function createInitialState(): ReversiState {
  return { board: initialBoard(), turn: BLACK, moveNumber: 0 };
}

/** 両者とも置けなければ終局（盤面が埋まった場合も含む） */
export function isTerminal(state: ReversiState): boolean {
  return !hasPlaceable(state.board, state.turn) && !hasPlaceable(state.board, opponent(state.turn));
}

function legalMoves(state: ReversiState): readonly ReversiMove[] {
  const indices = placeableIndices(state.board, state.turn);
  if (indices.length > 0) return indices.map((index) => ({ type: "place", index }) as const);
  if (isTerminal(state)) return [];
  return [{ type: "pass" }];
}

function applyMove(state: ReversiState, move: ReversiMove): MoveResult<ReversiState, ReversiEvent> {
  const disc = state.turn;
  if (move.type === "pass") {
    if (hasPlaceable(state.board, disc) || isTerminal(state)) {
      throw new IllegalMoveError("置ける場所があるときはパスできません");
    }
    return {
      state: { board: state.board, turn: opponent(disc), moveNumber: state.moveNumber + 1 },
      events: [{ type: "passed", disc }],
    };
  }

  const { index } = move;
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
    throw new IllegalMoveError(`盤外です: ${index}`);
  }
  const flips = findFlips(state.board, index, disc);
  if (flips.length === 0) {
    throw new IllegalMoveError(`${toNotation(index)} には置けません`);
  }
  const board: Cell[] = state.board.slice();
  board[index] = disc;
  for (const i of flips) board[i] = disc;

  return {
    state: { board, turn: opponent(disc), moveNumber: state.moveNumber + 1 },
    events: [
      { type: "placed", index, disc },
      { type: "flipped", indices: flips, to: disc },
    ],
  };
}

function result(state: ReversiState): GameResult | null {
  if (!isTerminal(state)) return null;
  const { black, white } = countDiscs(state.board);
  const scores = [black, white] as const;
  if (black === white) return { kind: "draw", scores };
  return { kind: "win", winner: black > white ? 0 : 1, scores };
}

export const reversi: GameDefinition<ReversiState, ReversiMove, ReversiEvent> = {
  id: "reversi",
  setup: () => createInitialState(),
  currentPlayer: (state) => (isTerminal(state) ? null : discToPlayer(state.turn)),
  legalMoves,
  applyMove,
  result,
  isSameMove: (a, b) =>
    a.type === b.type && (a.type === "pass" || (b.type === "place" && a.index === b.index)),
  playerView: (state) => state,
};
