import type { Cell, Piece } from "./types";

export const COLS = 7;
export const ROWS = 6;
export const CELL_COUNT = COLS * ROWS;
/** 並べる数 */
export const CONNECT = 4;

export const toIndex = (row: number, col: number): number => row * COLS + col;
export const rowOf = (index: number): number => Math.floor(index / COLS);
export const colOf = (index: number): number => index % COLS;
export const opponent = (piece: Piece): Piece => (piece === 1 ? 2 : 1);

export const emptyBoard = (): Cell[] => new Array<Cell>(CELL_COUNT).fill(0);

/** その列で駒が止まる行。満杯なら -1 */
export function landingRow(board: readonly Cell[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[toIndex(row, col)] === 0) return row;
  }
  return -1;
}

/** 4 つの方向（横・縦・右下がり・右上がり） */
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
] as const;

/**
 * index に置かれた駒を含む「4 つ以上の並び」を探す。
 * 見つかれば並んだマス全部（5 つ以上のこともある）を返す。
 */
export function findLine(board: readonly Cell[], index: number): number[] | null {
  const piece = board[index];
  if (!piece) return null;
  const row = rowOf(index);
  const col = colOf(index);
  const cells = new Set<number>();
  for (const [dr, dc] of DIRECTIONS) {
    const line = [index];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[toIndex(r, c)] === piece) {
        line.push(toIndex(r, c));
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= CONNECT) for (const i of line) cells.add(i);
  }
  return cells.size > 0 ? [...cells].sort((a, b) => a - b) : null;
}

/**
 * テスト用: 文字列から盤面を作る。上の行から順に `.`=空, `R`=赤, `Y`=黄。
 */
export function parseBoard(text: string): Cell[] {
  const rows = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (rows.length !== ROWS) throw new Error(`行数が ${ROWS} ではありません`);
  return rows.flatMap((line) => {
    if (line.length !== COLS) throw new Error(`列数が ${COLS} ではありません: ${line}`);
    return [...line].map((ch): Cell => (ch === "R" ? 1 : ch === "Y" ? 2 : 0));
  });
}
