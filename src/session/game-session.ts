import type { GameDefinition, GameResult, PlayerId } from "../core/game";
import { IllegalMoveError } from "../core/errors";

export type PlayerController<S, M> =
  | { readonly kind: "human" }
  | {
      /** remote は将来のオンライン対戦用 */
      readonly kind: "cpu" | "remote";
      requestMove(state: S, signal: AbortSignal): Promise<M>;
    };

export interface SessionUpdate<S, M, E> {
  readonly state: S;
  readonly events: readonly E[];
  readonly move: M | null;
  readonly player: PlayerId | null;
  readonly reason: "move" | "undo" | "reset";
}

export interface HistoryEntry<S, M> {
  /** 手を指す前の状態 */
  readonly state: S;
  readonly move: M;
  readonly player: PlayerId;
}

type Listener<S, M, E> = (update: SessionUpdate<S, M, E>) => void;

/**
 * ルール層の純粋関数を実際のゲーム進行に結びつける（docs/design.md 4章）。
 * 状態・履歴・手番の進行を管理し、CPU の手番では自動で思考を要求する。
 */
export class GameSession<S, M, E> {
  private currentState: S;
  private readonly entries: HistoryEntry<S, M>[] = [];
  private readonly listeners = new Set<Listener<S, M, E>>();
  private pending: AbortController | null = null;
  private disposed = false;

  constructor(
    readonly game: GameDefinition<S, M, E>,
    private readonly players: readonly PlayerController<S, M>[],
    private readonly onError: (error: unknown) => void = (error) => console.error(error),
  ) {
    this.currentState = game.setup({ players: players.length });
  }

  get state(): S {
    return this.currentState;
  }

  get history(): readonly HistoryEntry<S, M>[] {
    return this.entries;
  }

  get currentPlayer(): PlayerId | null {
    return this.game.currentPlayer(this.currentState);
  }

  get result(): GameResult | null {
    return this.game.result(this.currentState);
  }

  get legalMoves(): readonly M[] {
    return this.game.legalMoves(this.currentState);
  }

  get isThinking(): boolean {
    return this.pending !== null;
  }

  controllerOf(player: PlayerId): PlayerController<S, M> | undefined {
    return this.players[player];
  }

  isHumanTurn(): boolean {
    const player = this.currentPlayer;
    return player !== null && this.players[player]?.kind === "human";
  }

  subscribe(listener: Listener<S, M, E>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 購読の準備ができてから呼ぶ。最初の手番が CPU ならここで思考を始める */
  start(): void {
    this.scheduleNext();
  }

  /** 手を指す。合法手でなければ IllegalMoveError */
  submit(move: M): void {
    if (this.disposed) return;
    const player = this.currentPlayer;
    if (player === null) throw new IllegalMoveError("ゲームは終了しています");
    if (!this.legalMoves.some((m) => this.game.isSameMove(m, move))) {
      throw new IllegalMoveError("合法手ではありません");
    }
    const { state, events } = this.game.applyMove(this.currentState, move);
    this.entries.push({ state: this.currentState, move, player });
    this.currentState = state;
    this.emit({ state, events, move, player, reason: "move" });
    this.scheduleNext();
  }

  /** 人間が考えるべき局面まで戻せるか */
  canUndo(): boolean {
    return this.entries.some((e) => this.players[e.player]?.kind === "human");
  }

  /**
   * 1 手戻す。CPU 戦では人間の手番まで戻る（通常は 2 手）。
   * パスしかない局面（考える余地がない局面）も飛ばして戻る。
   */
  undo(): void {
    if (this.disposed || !this.canUndo()) return;
    this.cancelPending();
    while (this.entries.length > 0) {
      const entry = this.entries.pop() as HistoryEntry<S, M>;
      this.currentState = entry.state;
      if (this.isHumanTurn() && this.legalMoves.length > 1) break;
    }
    this.emit({
      state: this.currentState,
      events: [],
      move: null,
      player: this.currentPlayer,
      reason: "undo",
    });
    this.scheduleNext();
  }

  reset(): void {
    if (this.disposed) return;
    this.cancelPending();
    this.entries.length = 0;
    this.currentState = this.game.setup({ players: this.players.length });
    this.emit({
      state: this.currentState,
      events: [],
      move: null,
      player: this.currentPlayer,
      reason: "reset",
    });
    this.scheduleNext();
  }

  dispose(): void {
    this.cancelPending();
    this.listeners.clear();
    this.disposed = true;
  }

  private emit(update: SessionUpdate<S, M, E>): void {
    for (const listener of [...this.listeners]) listener(update);
  }

  private cancelPending(): void {
    this.pending?.abort();
    this.pending = null;
  }

  private scheduleNext(): void {
    this.cancelPending();
    const player = this.currentPlayer;
    if (player === null) return;
    const controller = this.players[player];
    if (!controller || controller.kind === "human") return;

    const abort = new AbortController();
    this.pending = abort;
    const stateAtRequest = this.currentState;
    controller.requestMove(stateAtRequest, abort.signal).then(
      (move) => {
        if (abort.signal.aborted || this.pending !== abort || this.disposed) return;
        this.pending = null;
        try {
          this.submit(move);
        } catch (error) {
          this.onError(error);
        }
      },
      (error: unknown) => {
        if (abort.signal.aborted) return;
        this.pending = null;
        this.onError(error);
      },
    );
  }
}
