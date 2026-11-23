import { Actor, Scene, vec, type Label, type SceneActivationContext } from "excalibur";
import { CPU_LEVEL_LABELS } from "../../ai/types";
import { CpuWorkerClient } from "../../ai/worker-client";
import { fourInARow, pieceToPlayer, playerToPiece } from "../../games/four-in-a-row/rules";
import type { FourEvent, FourMove, FourState, Piece } from "../../games/four-in-a-row/types";
import { cpuController, humanController } from "../../session/controllers";
import { GameSession, type PlayerController, type SessionUpdate } from "../../session/game-session";
import { setDebug } from "../debug";
import { DEFAULT_SETTINGS, type MatchSettings } from "../settings";
import { STRINGS } from "../strings";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, HEX, LAYOUT } from "../theme";
import { wait } from "../tween";
import { BoardView } from "../views/BoardView";
import { pieceGraphic, roundedRect } from "../views/graphics";
import { Button } from "../widgets/Button";
import { makeText } from "../widgets/text";

type Session = GameSession<FourState, FourMove, FourEvent>;
type Update = SessionUpdate<FourState, FourMove, FourEvent>;

const CPU_MIN_DELAY_MS = 450;
const RESULT_DELAY_MS = 400;

const colorName = (piece: Piece) => (piece === 1 ? STRINGS.red : STRINGS.yellow);

export class GameScene extends Scene<MatchSettings> {
  private settings: MatchSettings = DEFAULT_SETTINGS;
  private session: Session | null = null;
  private worker: CpuWorkerClient | null = null;
  private board!: BoardView;
  private status!: Label;
  private turnGlow!: Record<Piece, Actor>;
  private undoButton!: Button;
  private footer: Button[] = [];
  private overlay: Actor[] = [];

  /** 画面に表示し終えた状態（アニメーション中は session.state より遅れる） */
  private shown!: FourState;
  /** 更新を 1 つずつ順にアニメーションさせるためのキュー */
  private queue: Promise<void> = Promise.resolve();
  private queued = 0;
  /** 古い対局のアニメーションを無視するための番号 */
  private generation = 0;

  override onActivate(context: SceneActivationContext<MatchSettings>): void {
    this.settings = context.data ?? this.settings;
    this.startMatch();
  }

  override onDeactivate(): void {
    this.disposeMatch();
  }

  private startMatch(): void {
    this.disposeMatch();
    this.clear();
    this.generation++;
    this.queue = Promise.resolve();
    this.queued = 0;
    this.overlay = [];

    this.worker = new CpuWorkerClient();
    const session: Session = new GameSession(fourInARow, this.createPlayers(), (error) =>
      console.error(error),
    );
    this.session = session;
    this.shown = session.state;

    this.createHeader();
    this.board = new BoardView(this, {
      onColumnClick: (col) => this.onColumnClick(col),
      clickableColumns: () => this.humanColumns(),
      previewPiece: () => (this.humanColumns().length > 0 ? this.shown.turn : null),
    });
    this.board.setBoard(this.shown.board);
    this.createFooter();

    const generation = this.generation;
    session.subscribe((update) => {
      this.queued++;
      this.queue = this.queue
        .then(() => (generation === this.generation ? this.handleUpdate(update) : undefined))
        .catch((error: unknown) => console.error(error))
        .finally(() => {
          this.queued--;
          if (generation === this.generation) this.refresh();
        });
    });

    setDebug({
      scene: "game",
      getState: () => session.state,
      isBusy: () => this.queued > 0 || session.isThinking,
      humanMoves: () => this.humanColumns(),
    });

    this.refresh();
    session.start();
    this.refresh();
  }

  private disposeMatch(): void {
    this.generation++;
    this.session?.dispose();
    this.worker?.terminate();
    this.session = null;
    this.worker = null;
  }

  private createPlayers(): PlayerController<FourState, FourMove>[] {
    if (this.settings.mode === "2p") return [humanController(), humanController()];
    const { level } = this.settings;
    const cpu = cpuController<FourState, FourMove>((state, signal) => {
      if (!this.worker) return Promise.reject(new Error("worker disposed"));
      return this.worker.think("four-in-a-row", state, level, signal);
    }, CPU_MIN_DELAY_MS);
    return this.settings.humanPiece === 1 ? [humanController(), cpu] : [cpu, humanController()];
  }

  private playerLabel(piece: Piece): string {
    if (this.settings.mode === "2p") return colorName(piece);
    return piece === this.settings.humanPiece
      ? STRINGS.you
      : STRINGS.cpuLabel(CPU_LEVEL_LABELS[this.settings.level]);
  }

  private createHeader(): void {
    const makePanel = (piece: Piece, x: number): Actor => {
      const glow = new Actor({ pos: vec(x, 90), z: 5 });
      glow.graphics.use(roundedRect(320, 96, 16, HEX.buttonSelected, 0.25));
      this.add(glow);
      const icon = new Actor({ pos: vec(x - 110, 90), z: 6 });
      icon.graphics.use(pieceGraphic(piece, 26));
      this.add(icon);
      const order = piece === 1 ? STRINGS.first : STRINGS.second;
      this.add(makeText(x - 70, 72, order, { size: 24, color: COLORS.textDim, align: "left" }));
      this.add(
        makeText(x - 70, 108, this.playerLabel(piece), {
          size: 32,
          color: COLORS.text,
          bold: true,
          align: "left",
        }),
      );
      return glow;
    };
    this.turnGlow = { 1: makePanel(1, 190), 2: makePanel(2, 530) };
    this.status = makeText(GAME_WIDTH / 2, 180, "", { size: 28, color: COLORS.text });
    this.add(this.status);
  }

  private createFooter(): void {
    const L = LAYOUT.game;
    const options = { width: 200, fontSize: 28 };
    this.undoButton = new Button(L.undo.x, L.undo.y, STRINGS.undo, {
      ...options,
      onClick: () => {
        if (this.queued === 0) this.session?.undo();
      },
    });
    const restart = new Button(L.restart.x, L.restart.y, STRINGS.restart, {
      ...options,
      onClick: () => this.startMatch(),
    });
    const title = new Button(L.title.x, L.title.y, STRINGS.backToTitle, {
      ...options,
      onClick: () => void this.engine.goToScene("title"),
    });
    this.footer = [this.undoButton, restart, title];
    for (const b of this.footer) this.add(b);
  }

  private isIdle(): boolean {
    return this.queued === 0 && this.session !== null && this.shown === this.session.state;
  }

  /** 人間の手番で、今クリックして落とせる列 */
  private humanColumns(): number[] {
    const session = this.session;
    if (!session || !this.isIdle() || !session.isHumanTurn()) return [];
    return session.legalMoves.map((m) => m.column).sort((a, b) => a - b);
  }

  private onColumnClick(column: number): void {
    if (!this.humanColumns().includes(column)) return;
    this.session?.submit({ column });
    this.board.refreshHover();
  }

  private async handleUpdate(update: Update): Promise<void> {
    if (update.reason !== "move") {
      this.hideResult();
      this.board.setBoard(update.state.board);
      const last = this.session?.history.at(-1);
      this.board.setLastMove(last ? this.lastIndex(update.state, last.move) : null);
      this.shown = update.state;
      return;
    }
    for (const event of update.events) {
      switch (event.type) {
        case "dropped":
          this.refreshStatusFor(update.state, true);
          await this.board.animateDrop(event.index, event.piece);
          break;
        case "connected":
          await this.board.setWinLine(event.indices);
          break;
      }
    }
    this.shown = update.state;
  }

  /** move で置かれた駒のマス（その列で一番上の駒） */
  private lastIndex(state: FourState, move: FourMove): number | null {
    for (let row = 0; row < 6; row++) {
      const index = row * 7 + move.column;
      if (state.board[index] !== 0) return index;
    }
    return null;
  }

  /** 表示中の状態に合わせて、手番・ボタン・ホバー表示を更新する */
  private refresh(): void {
    const session = this.session;
    if (!session) return;
    this.refreshStatusFor(this.shown, false);
    const idle = this.isIdle();
    this.undoButton.setEnabled(idle && session.canUndo() && this.overlay.length === 0);
    this.board.refreshHover();

    const result = fourInARow.result(this.shown);
    if (result && idle && this.overlay.length === 0) {
      const generation = this.generation;
      void wait(RESULT_DELAY_MS).then(() => {
        if (generation === this.generation && this.overlay.length === 0) this.showResult();
      });
    }
  }

  private refreshStatusFor(state: FourState, animating: boolean): void {
    const finished = fourInARow.result(state) !== null;
    for (const piece of [1, 2] as const) {
      this.turnGlow[piece].graphics.isVisible = !finished && state.turn === piece;
    }
    this.status.text = finished || animating ? "" : this.statusText(state);
  }

  private statusText(state: FourState): string {
    const piece = state.turn;
    const controller = this.session?.controllerOf(pieceToPlayer(piece));
    if (controller?.kind === "cpu") return STRINGS.cpuThinking;
    if (this.settings.mode === "cpu") return STRINGS.yourTurn(colorName(piece));
    return STRINGS.turnOf(colorName(piece));
  }

  private showResult(): void {
    const session = this.session;
    const result = session?.result;
    if (!session || !result) return;
    let headline: string;
    let detail: string;
    if (result.kind === "draw") {
      headline = STRINGS.draw;
      detail = STRINGS.drawDetail;
    } else {
      const winner = playerToPiece(result.winner);
      headline =
        this.settings.mode === "cpu"
          ? winner === this.settings.humanPiece
            ? STRINGS.youWin
            : STRINGS.youLose
          : STRINGS.win(colorName(winner));
      detail = STRINGS.moves(session.state.moveNumber);
    }

    const dim = new Actor({
      pos: vec(GAME_WIDTH / 2, GAME_HEIGHT / 2),
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      z: 100,
    });
    dim.graphics.use(roundedRect(GAME_WIDTH, GAME_HEIGHT, 0, "#000000", 0.55));
    // 下にある盤やボタンにクリックを通さない
    dim.on("pointerup", (e) => e.cancel());
    dim.on("pointermove", (e) => e.cancel());
    const panel = new Actor({ pos: vec(GAME_WIDTH / 2, 540), z: 101 });
    panel.graphics.use(roundedRect(GAME_WIDTH - 120, 360, 28, HEX.panel, 0.97));
    const head = makeText(GAME_WIDTH / 2, 450, headline, {
      size: 60,
      color: COLORS.accent,
      bold: true,
    });
    const sub = makeText(GAME_WIDTH / 2, 530, detail, { size: 32, color: COLORS.text });
    head.z = sub.z = 102;
    const L = LAYOUT.result;
    const again = new Button(L.again.x, L.again.y, STRINGS.playAgain, {
      onClick: () => this.startMatch(),
    });
    const title = new Button(L.title.x, L.title.y, STRINGS.backToTitle, {
      onClick: () => void this.engine.goToScene("title"),
    });
    again.z = title.z = 110;
    this.overlay = [dim, panel, head, sub, again, title];
    for (const actor of this.overlay) this.add(actor);
    for (const b of this.footer) b.setEnabled(false);

    setDebug({ ...window.__FOUR__, scene: "result" });
  }

  private hideResult(): void {
    for (const actor of this.overlay) actor.kill();
    this.overlay = [];
    for (const b of this.footer) b.setEnabled(true);
    if (window.__FOUR__) setDebug({ ...window.__FOUR__, scene: "game" });
  }
}
