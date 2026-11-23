/** 0=空, 1=黒, 2=白 */
export type Cell = 0 | 1 | 2;
export type Disc = 1 | 2;

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export interface ReversiState {
  /** 長さ 64。index = row * 8 + col（row 0 が上、col 0 が左） */
  readonly board: readonly Cell[];
  /** 次に打つ色（黒が先手） */
  readonly turn: Disc;
  /** これまでに指された手数（パスを含む） */
  readonly moveNumber: number;
}

export type ReversiMove =
  | { readonly type: "place"; readonly index: number }
  /** 合法手が無いときのみ合法 */
  | { readonly type: "pass" };

export type ReversiEvent =
  | { readonly type: "placed"; readonly index: number; readonly disc: Disc }
  | { readonly type: "flipped"; readonly indices: readonly number[]; readonly to: Disc }
  | { readonly type: "passed"; readonly disc: Disc };
