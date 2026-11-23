import { BLACK, EMPTY, WHITE, type Cell, type Disc } from "./types";

export const SIZE = 8;
export const CELL_COUNT = SIZE * SIZE;

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const toIndex = (row: number, col: number): number => row * SIZE + col;
export const rowOf = (index: number): number => Math.floor(index / SIZE);
export const colOf = (index: number): number => index % SIZE;
const inside = (row: number, col: number): boolean =>
  row >= 0 && row < SIZE && col >= 0 && col < SIZE;

export const opponent = (disc: Disc): Disc => (disc === BLACK ? WHITE : BLACK);

/** 標準の初期配置: d4・e5 に白、d5・e4 に黒 */
export function initialBoard(): Cell[] {
  const board: Cell[] = new Array<Cell>(CELL_COUNT).fill(EMPTY);
  board[toIndex(3, 3)] = WHITE;
  board[toIndex(4, 4)] = WHITE;
  board[toIndex(3, 4)] = BLACK;
  board[toIndex(4, 3)] = BLACK;
  return board;
}

/** index に disc を置いたときに裏返る石。空配列なら置けない */
export function findFlips(board: readonly Cell[], index: number, disc: Disc): number[] {
  if (board[index] !== EMPTY) return [];
  const opp = opponent(disc);
  const row0 = rowOf(index);
  const col0 = colOf(index);
  const flips: number[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let row = row0 + dr;
    let col = col0 + dc;
    const line: number[] = [];
    while (inside(row, col) && board[toIndex(row, col)] === opp) {
      line.push(toIndex(row, col));
      row += dr;
      col += dc;
    }
    if (line.length > 0 && inside(row, col) && board[toIndex(row, col)] === disc) {
      flips.push(...line);
    }
  }
  return flips;
}

export function canPlace(board: readonly Cell[], index: number, disc: Disc): boolean {
  return findFlips(board, index, disc).length > 0;
}

/** disc が置けるマスの一覧（index 昇順） */
export function placeableIndices(board: readonly Cell[], disc: Disc): number[] {
  const result: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (canPlace(board, i, disc)) result.push(i);
  }
  return result;
}

export function hasPlaceable(board: readonly Cell[], disc: Disc): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (canPlace(board, i, disc)) return true;
  }
  return false;
}

export function countDiscs(board: readonly Cell[]): {
  black: number;
  white: number;
  empty: number;
} {
  let black = 0;
  let white = 0;
  for (const cell of board) {
    if (cell === BLACK) black++;
    else if (cell === WHITE) white++;
  }
  return { black, white, empty: CELL_COUNT - black - white };
}

/** "d3" のような表記（列 a〜h、行 1〜8 を上から） */
export function toNotation(index: number): string {
  return `${String.fromCharCode(97 + colOf(index))}${rowOf(index) + 1}`;
}

export function fromNotation(notation: string): number {
  const match = /^([a-h])([1-8])$/.exec(notation.trim().toLowerCase());
  if (!match) throw new Error(`不正な座標: ${notation}`);
  const col = (match[1] as string).charCodeAt(0) - 97;
  const row = Number(match[2]) - 1;
  return toIndex(row, col);
}

/** テストやデバッグ用: "B" "W" "." の 8 行文字列から盤面を作る */
export function parseBoard(text: string): Cell[] {
  const chars = text.replace(/\s+/g, "");
  if (chars.length !== CELL_COUNT) throw new Error(`盤面は 64 マス必要です（${chars.length}）`);
  return [...chars].map((ch) => {
    if (ch === "B") return BLACK;
    if (ch === "W") return WHITE;
    if (ch === ".") return EMPTY;
    throw new Error(`不正な文字: ${ch}`);
  });
}

export function formatBoard(board: readonly Cell[]): string {
  const lines: string[] = [];
  for (let row = 0; row < SIZE; row++) {
    let line = "";
    for (let col = 0; col < SIZE; col++) {
      const cell = board[toIndex(row, col)];
      line += cell === BLACK ? "B" : cell === WHITE ? "W" : ".";
    }
    lines.push(line);
  }
  return lines.join("\n");
}
