/** 0=空, 1=赤（先手）, 2=黄（後手） */
export type Cell = 0 | 1 | 2;
export type Piece = 1 | 2;

export const EMPTY = 0;
export const RED = 1;
export const YELLOW = 2;

export interface FourState {
  /** 長さ COLS * ROWS。index = row * COLS + col（row 0 が一番上） */
  readonly board: readonly Cell[];
  /** 次に落とす色（赤が先手） */
  readonly turn: Piece;
  /** これまでに指された手数 */
  readonly moveNumber: number;
  /** 4 つ並んだマス。勝負がついていなければ null */
  readonly winLine: readonly number[] | null;
}

/** 駒を落とす列 */
export interface FourMove {
  readonly column: number;
}

export type FourEvent =
  | {
      readonly type: "dropped";
      readonly column: number;
      readonly row: number;
      readonly index: number;
      readonly piece: Piece;
    }
  | { readonly type: "connected"; readonly indices: readonly number[]; readonly piece: Piece };
