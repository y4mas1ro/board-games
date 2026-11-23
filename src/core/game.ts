/**
 * すべてのゲームが実装する共通インターフェース（docs/design.md 3.1）。
 * 状態はイミュータブル、関数はすべて純粋関数とする。
 * このファイルは Phaser・DOM に依存してはいけない。
 */

/** プレイヤー番号。0 が先手。 */
export type PlayerId = number;

export interface SetupOptions {
  players: number;
  /** 乱数を使うゲーム用（シャッフル等） */
  seed?: number;
}

export interface MoveResult<S, E> {
  state: S;
  /** UI のアニメーション用に「何が起きたか」を返す */
  events: readonly E[];
}

export type GameResult =
  | { kind: "win"; winner: PlayerId; scores?: readonly number[] }
  | { kind: "draw"; scores?: readonly number[] };

export interface GameDefinition<S, M, E = never> {
  readonly id: string;
  setup(options: SetupOptions): S;
  /** 次に手を指すプレイヤー。終局なら null */
  currentPlayer(state: S): PlayerId | null;
  /** 合法手の一覧。終局なら空 */
  legalMoves(state: S): readonly M[];
  /** 合法手以外を渡すと IllegalMoveError */
  applyMove(state: S, move: M): MoveResult<S, E>;
  /** 終局前は null */
  result(state: S): GameResult | null;
  /** 2 つの手が同じかどうか（合法性チェックに使う） */
  isSameMove(a: M, b: M): boolean;
  /** 隠し情報を持つゲーム用。プレイヤーから見える状態を返す */
  playerView?(state: S, player: PlayerId): unknown;
}
