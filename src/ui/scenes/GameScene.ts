import Phaser from "phaser";
import { CpuWorkerClient } from "../../ai/worker-client";
import { CPU_LEVEL_LABELS } from "../../games/reversi/ai";
import { countDiscs } from "../../games/reversi/board";
import { discToPlayer, playerToDisc, reversi } from "../../games/reversi/rules";
import type { Disc, ReversiEvent, ReversiMove, ReversiState } from "../../games/reversi/types";
import { cpuController, humanController } from "../../session/controllers";
import { GameSession, type PlayerController, type SessionUpdate } from "../../session/game-session";
import { setDebug } from "../debug";
import type { MatchSettings } from "../settings";
import { STRINGS } from "../strings";
import { COLORS, FONT_FAMILY, GAME_WIDTH, LAYOUT } from "../theme";
import { wait } from "../tween";
import { BoardView } from "../views/BoardView";
import { Button } from "../widgets/Button";
import type { ResultData } from "./ResultScene";

type Session = GameSession<ReversiState, ReversiMove, ReversiEvent>;
type Update = SessionUpdate<ReversiState, ReversiMove, ReversiEvent>;

const CPU_MIN_DELAY_MS = 450;
const PASS_MESSAGE_MS = 1100;

const colorName = (disc: Disc) => (disc === 1 ? STRINGS.black : STRINGS.white);

interface PlayerPanel {
  bg: Phaser.GameObjects.Graphics;
  count: Phaser.GameObjects.Text;
  x: number;
}

export class GameScene extends Phaser.Scene {
  private settings!: MatchSettings;
  private session!: Session;
  private worker!: CpuWorkerClient;
  private board!: BoardView;
  private status!: Phaser.GameObjects.Text;
  private panels!: Record<Disc, PlayerPanel>;
  private undoButton!: Button;

  /** 画面に表示し終えた状態（アニメーション中は session.state より遅れる） */
  private shown!: ReversiState;
  /** 更新を 1 つずつ順にアニメーションさせるためのキュー */
  private queue: Promise<void> = Promise.resolve();
  private queued = 0;
  private message: string | null = null;
  private resultShown = false;

  constructor() {
    super("GameScene");
  }

  init(settings: MatchSettings): void {
    this.settings = settings;
    this.queue = Promise.resolve();
    this.queued = 0;
    this.message = null;
    this.resultShown = false;
  }

  create(): void {
    this.worker = new CpuWorkerClient();
    const players = this.createPlayers();
    this.session = new GameSession(reversi, players, (error) => console.error(error));
    this.shown = this.session.state;

    this.createHeader();
    this.board = new BoardView(this, (index) => this.onCellClick(index));
    this.board.setBoard(this.shown.board);
    this.createFooter();

    this.session.subscribe((update) => {
      this.queued++;
      this.queue = this.queue
        .then(() => this.handleUpdate(update))
        .catch((error: unknown) => console.error(error))
        .finally(() => {
          this.queued--;
          this.refresh();
        });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session.dispose();
      this.worker.terminate();
    });

    setDebug({
      scene: "game",
      getState: () => this.session.state,
      isBusy: () => this.queued > 0 || this.session.isThinking,
      humanMoves: () =>
        this.isIdle() && this.session.isHumanTurn()
          ? this.session.legalMoves.flatMap((m) => (m.type === "place" ? [m.index] : []))
          : [],
    });

    this.refresh();
    this.session.start();
    this.refresh();
  }

  private createPlayers(): PlayerController<ReversiState, ReversiMove>[] {
    if (this.settings.mode === "2p") return [humanController(), humanController()];
    const { level } = this.settings;
    const cpu = cpuController<ReversiState, ReversiMove>(
      (state, signal) => this.worker.think("reversi", state, level, signal),
      CPU_MIN_DELAY_MS,
    );
    return this.settings.humanDisc === 1 ? [humanController(), cpu] : [cpu, humanController()];
  }

  private playerLabel(disc: Disc): string {
    if (this.settings.mode === "2p") return colorName(disc);
    return disc === this.settings.humanDisc
      ? "あなた"
      : STRINGS.cpuLabel(CPU_LEVEL_LABELS[this.settings.level]);
  }

  private createHeader(): void {
    const makePanel = (disc: Disc, x: number): PlayerPanel => {
      const bg = this.add.graphics();
      this.add
        .circle(x - 110, 90, 26, disc === 1 ? COLORS.black : COLORS.white)
        .setStrokeStyle(2, COLORS.discEdge, 0.6);
      this.add
        .text(x - 70, 70, this.playerLabel(disc), {
          fontFamily: FONT_FAMILY,
          fontSize: "24px",
          color: COLORS.textDim,
        })
        .setOrigin(0, 0.5);
      const count = this.add
        .text(x - 70, 108, "2", {
          fontFamily: FONT_FAMILY,
          fontSize: "40px",
          fontStyle: "bold",
          color: COLORS.text,
        })
        .setOrigin(0, 0.5);
      return { bg, count, x };
    };
    this.panels = { 1: makePanel(1, 190), 2: makePanel(2, 530) };
    this.status = this.add
      .text(GAME_WIDTH / 2, 178, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "28px",
        color: COLORS.text,
      })
      .setOrigin(0.5);
  }

  private createFooter(): void {
    const L = LAYOUT.game;
    this.undoButton = new Button(this, L.undo.x, L.undo.y, STRINGS.undo, {
      width: 200,
      fontSize: 28,
      onClick: () => {
        if (this.queued === 0) this.session.undo();
      },
    });
    new Button(this, L.restart.x, L.restart.y, STRINGS.restart, {
      width: 200,
      fontSize: 28,
      onClick: () => this.scene.restart(this.settings),
    });
    new Button(this, L.title.x, L.title.y, STRINGS.backToTitle, {
      width: 200,
      fontSize: 28,
      onClick: () => {
        this.scene.stop("ResultScene");
        this.scene.start("TitleScene");
      },
    });
  }

  private isIdle(): boolean {
    return this.queued === 0 && this.shown === this.session.state;
  }

  private onCellClick(index: number): void {
    if (!this.isIdle() || !this.session.isHumanTurn()) return;
    const move: ReversiMove = { type: "place", index };
    if (!this.session.legalMoves.some((m) => reversi.isSameMove(m, move))) return;
    this.board.setHints([]);
    this.session.submit(move);
  }

  private async handleUpdate(update: Update): Promise<void> {
    if (update.reason !== "move") {
      this.scene.stop("ResultScene");
      this.resultShown = false;
      this.board.setBoard(update.state.board);
      const last = [...this.session.history].reverse().find((e) => e.move.type === "place");
      this.board.setLastMove(last && last.move.type === "place" ? last.move.index : null);
      this.shown = update.state;
      return;
    }
    this.board.setHints([]);
    for (const event of update.events) {
      switch (event.type) {
        case "placed":
          await this.board.animatePlace(event.index, event.disc);
          break;
        case "flipped":
          await this.board.animateFlip(event.indices, event.to);
          break;
        case "passed":
          this.message = STRINGS.passed(colorName(event.disc));
          this.refresh();
          await wait(this, PASS_MESSAGE_MS);
          this.message = null;
          break;
      }
    }
    this.shown = update.state;
  }

  /** 表示中の状態に合わせて、石数・手番・ヒント・ボタンを更新する */
  private refresh(): void {
    if (!this.scene.isActive()) return;
    const state = this.shown;
    const { black, white } = countDiscs(state.board);
    this.panels[1].count.setText(String(black));
    this.panels[2].count.setText(String(white));
    const result = reversi.result(state);
    for (const disc of [1, 2] as const) {
      const panel = this.panels[disc];
      panel.bg.clear();
      if (!result && state.turn === disc) {
        panel.bg.fillStyle(COLORS.buttonSelected, 0.25);
        panel.bg.fillRoundedRect(panel.x - 160, 42, 320, 96, 16);
      }
    }

    const idle = this.isIdle();
    this.undoButton.setEnabled(idle && this.session.canUndo());
    this.status.setText(this.statusText(state));

    const humanTurn = idle && this.session.isHumanTurn();
    const moves = humanTurn ? this.session.legalMoves : [];
    this.board.setHints(moves.flatMap((m) => (m.type === "place" ? [m.index] : [])));

    // 人間が置ける場所がなければ自動でパスする（メッセージは passed イベントで表示）
    if (humanTurn && moves.length === 1 && moves[0]?.type === "pass") {
      const expected = this.session.state;
      this.time.delayedCall(0, () => {
        if (this.session.state === expected && this.isIdle()) this.session.submit({ type: "pass" });
      });
    }

    if (result && idle && !this.resultShown) {
      this.resultShown = true;
      this.time.delayedCall(500, () => this.showResult());
    }
  }

  private statusText(state: ReversiState): string {
    if (this.message) return this.message;
    if (reversi.result(state)) return "";
    const disc = state.turn;
    const controller = this.session.controllerOf(discToPlayer(disc));
    if (controller?.kind === "cpu") return STRINGS.cpuThinking;
    if (this.settings.mode === "cpu") return STRINGS.yourTurn(colorName(disc));
    return STRINGS.turnOf(colorName(disc));
  }

  private showResult(): void {
    const result = this.session.result;
    if (!result || !this.scene.isActive()) return;
    const [black, white] = (result.scores ?? [0, 0]) as [number, number];
    let headline: string;
    if (result.kind === "draw") {
      headline = STRINGS.draw;
    } else if (this.settings.mode === "cpu") {
      headline =
        playerToDisc(result.winner) === this.settings.humanDisc ? STRINGS.youWin : STRINGS.youLose;
    } else {
      headline = STRINGS.win(colorName(playerToDisc(result.winner)));
    }
    const data: ResultData = {
      settings: this.settings,
      headline,
      score: STRINGS.score(black, white),
    };
    this.scene.launch("ResultScene", data);
  }
}
