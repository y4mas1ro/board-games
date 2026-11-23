import type { GameDefinition, GameResult, MoveResult, PlayerId } from "../../core/game";
import { IllegalMoveError } from "../../core/errors";
import { CELL_COUNT, COLS, emptyBoard, findLine, landingRow, opponent, toIndex } from "./board";
import { RED, type Cell, type FourEvent, type FourMove, type FourState, type Piece } from "./types";

/** 赤 = プレイヤー 0、黄 = プレイヤー 1 */
export const pieceToPlayer = (piece: Piece): PlayerId => (piece === RED ? 0 : 1);
export const playerToPiece = (player: PlayerId): Piece => (player === 0 ? RED : 2);

/** 中央の列から順に並べる（CPU の探索で良い手を先に読むため） */
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6] as const;

export function createInitialState(): FourState {
  return { board: emptyBoard(), turn: RED, moveNumber: 0, winLine: null };
}

/** 4 つ並んだか、盤が埋まったら終局 */
export function isTerminal(state: FourState): boolean {
  return state.winLine !== null || state.moveNumber >= CELL_COUNT;
}

function legalMoves(state: FourState): readonly FourMove[] {
  if (isTerminal(state)) return [];
  return COLUMN_ORDER.filter((column) => state.board[column] === 0).map((column) => ({ column }));
}

function applyMove(state: FourState, move: FourMove): MoveResult<FourState, FourEvent> {
  if (isTerminal(state)) throw new IllegalMoveError("ゲームは終了しています");
  const { column } = move;
  if (!Number.isInteger(column) || column < 0 || column >= COLS) {
    throw new IllegalMoveError(`盤外の列です: ${column}`);
  }
  const row = landingRow(state.board, column);
  if (row < 0) throw new IllegalMoveError(`${column + 1} 列目は満杯です`);

  const piece = state.turn;
  const index = toIndex(row, column);
  const board: Cell[] = state.board.slice();
  board[index] = piece;
  const winLine = findLine(board, index);

  const events: FourEvent[] = [{ type: "dropped", column, row, index, piece }];
  if (winLine) events.push({ type: "connected", indices: winLine, piece });
  return {
    state: { board, turn: opponent(piece), moveNumber: state.moveNumber + 1, winLine },
    events,
  };
}

function result(state: FourState): GameResult | null {
  if (state.winLine) {
    // 勝った側は直前に指した側（turn は既に相手に移っている）
    return { kind: "win", winner: pieceToPlayer(opponent(state.turn)) };
  }
  if (state.moveNumber >= CELL_COUNT) return { kind: "draw" };
  return null;
}

export const fourInARow: GameDefinition<FourState, FourMove, FourEvent> = {
  id: "four-in-a-row",
  setup: () => createInitialState(),
  currentPlayer: (state) => (isTerminal(state) ? null : pieceToPlayer(state.turn)),
  legalMoves,
  applyMove,
  result,
  isSameMove: (a, b) => a.column === b.column,
  playerView: (state) => state,
};
