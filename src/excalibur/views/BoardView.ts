import { Actor, Canvas, easeOutBounce, vec, type Scene } from "excalibur";
import { CELL_COUNT, COLS, ROWS, colOf, rowOf } from "../../games/four-in-a-row/board";
import type { Cell, Piece } from "../../games/four-in-a-row/types";
import { BOARD, DROP_Y, HEX } from "../theme";
import { tween, wait } from "../tween";
import { pieceGraphic, ringGraphic, roundedRect } from "./graphics";

const PIECE_RADIUS = BOARD.cell * 0.4;
const BOARD_PAD = 16;
const BOARD_WIDTH = COLS * BOARD.cell;
const BOARD_HEIGHT = ROWS * BOARD.cell;

/** 描画の重なり順。駒は盤の後ろを落ち、穴から見える */
const Z = { piece: 1, board: 2, marker: 3, column: 0, preview: 4, input: 50 } as const;

export const columnCenterX = (col: number): number => BOARD.x + col * BOARD.cell + BOARD.cell / 2;
export const rowCenterY = (row: number): number => BOARD.y + row * BOARD.cell + BOARD.cell / 2;

export interface BoardInput {
  /** 列をクリック（タップ）した */
  onColumnClick(col: number): void;
  /** 今クリックできる列（ホバー表示用） */
  clickableColumns(): readonly number[];
  /** ホバー中に表示する駒の色。null なら表示しない */
  previewPiece(): Piece | null;
}

/** 盤面・駒・ホバー表示・勝ちの並びの表示を担当する */
export class BoardView {
  private readonly pieces: (Actor | null)[] = new Array<Actor | null>(CELL_COUNT).fill(null);
  private readonly preview: Actor;
  private readonly columnGlow: Actor;
  private readonly lastMarker: Actor;
  private winMarkers: Actor[] = [];
  private hoverColumn: number | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly input: BoardInput,
  ) {
    // 盤（穴をくり抜いた板）
    const frame = new Canvas({
      width: BOARD_WIDTH + BOARD_PAD * 2,
      height: BOARD_HEIGHT + BOARD_PAD * 2,
      cache: true,
      draw: (ctx) => {
        ctx.fillStyle = HEX.boardEdge;
        ctx.beginPath();
        ctx.roundRect(0, 0, BOARD_WIDTH + BOARD_PAD * 2, BOARD_HEIGHT + BOARD_PAD * 2, 22);
        ctx.fill();
        ctx.fillStyle = HEX.board;
        ctx.beginPath();
        ctx.roundRect(
          6,
          6,
          BOARD_WIDTH + BOARD_PAD * 2 - 12,
          BOARD_HEIGHT + BOARD_PAD * 2 - 12,
          18,
        );
        ctx.fill();
        ctx.globalCompositeOperation = "destination-out";
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            ctx.beginPath();
            ctx.arc(
              BOARD_PAD + c * BOARD.cell + BOARD.cell / 2,
              BOARD_PAD + r * BOARD.cell + BOARD.cell / 2,
              PIECE_RADIUS + 3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      },
    });
    const board = new Actor({
      pos: vec(BOARD.x + BOARD_WIDTH / 2, BOARD.y + BOARD_HEIGHT / 2),
      z: Z.board,
    });
    board.graphics.use(frame);
    scene.add(board);

    // ホバー中の列を明るくする
    this.columnGlow = new Actor({ pos: vec(0, BOARD.y + BOARD_HEIGHT / 2), z: Z.column });
    this.columnGlow.graphics.use(
      roundedRect(BOARD.cell - 6, BOARD_HEIGHT, 12, HEX.highlight, 0.12),
    );
    this.columnGlow.graphics.isVisible = false;
    scene.add(this.columnGlow);

    this.preview = new Actor({ pos: vec(0, DROP_Y), z: Z.preview });
    this.preview.graphics.opacity = 0.85;
    this.preview.graphics.isVisible = false;
    scene.add(this.preview);

    this.lastMarker = new Actor({ pos: vec(0, 0), z: Z.marker });
    this.lastMarker.graphics.use(ringGraphic(7, HEX.highlight, 4));
    this.lastMarker.graphics.isVisible = false;
    scene.add(this.lastMarker);

    // 入力用の透明な領域（盤と、その上の駒を落とす列）
    const top = DROP_Y - BOARD.cell / 2;
    const bottom = BOARD.y + BOARD_HEIGHT;
    const zone = new Actor({
      pos: vec(BOARD.x + BOARD_WIDTH / 2, (top + bottom) / 2),
      width: BOARD_WIDTH,
      height: bottom - top,
      z: Z.input,
    });
    const columnAt = (x: number): number | null => {
      const col = Math.floor((x - BOARD.x) / BOARD.cell);
      return col >= 0 && col < COLS ? col : null;
    };
    zone.on("pointermove", (e) => this.setHover(columnAt(e.worldPos.x)));
    zone.on("pointerleave", () => this.setHover(null));
    zone.on("pointerup", (e) => {
      const col = columnAt(e.worldPos.x);
      if (col !== null) this.input.onColumnClick(col);
    });
    scene.add(zone);
  }

  static cellCenter(index: number): { x: number; y: number } {
    return { x: columnCenterX(colOf(index)), y: rowCenterY(rowOf(index)) };
  }

  /** アニメーションなしで盤面全体を合わせる（Undo・リセット時） */
  setBoard(board: readonly Cell[]): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = board[i] ?? 0;
      const current = this.pieces[i] ?? null;
      current?.kill();
      this.pieces[i] = null;
      if (cell !== 0) this.pieces[i] = this.createPiece(i, cell);
    }
    this.setWinLine(null);
  }

  /** 盤の上から駒を落とす */
  async animateDrop(index: number, piece: Piece): Promise<void> {
    this.pieces[index]?.kill();
    const { x, y } = BoardView.cellCenter(index);
    const actor = new Actor({ pos: vec(x, DROP_Y), z: Z.piece });
    actor.graphics.use(pieceGraphic(piece, PIECE_RADIUS));
    this.scene.add(actor);
    this.pieces[index] = actor;
    this.setLastMove(null);
    const distance = y - DROP_Y;
    await tween(
      this.scene,
      220 + distance * 0.55,
      (t) => (actor.pos = vec(x, DROP_Y + distance * t)),
      easeOutBounce,
    );
    this.setLastMove(index);
  }

  setLastMove(index: number | null): void {
    if (index === null) {
      this.lastMarker.graphics.isVisible = false;
      return;
    }
    const { x, y } = BoardView.cellCenter(index);
    this.lastMarker.pos = vec(x, y);
    this.lastMarker.graphics.isVisible = true;
  }

  /** 4 つ並んだ駒を輪で囲み、脈打たせる */
  async setWinLine(indices: readonly number[] | null): Promise<void> {
    for (const marker of this.winMarkers) marker.kill();
    this.winMarkers = [];
    if (!indices) return;
    this.setLastMove(null);
    const ring = ringGraphic(PIECE_RADIUS + 4, HEX.highlight, 6);
    const pulses = indices.map((index, i) => {
      const { x, y } = BoardView.cellCenter(index);
      const marker = new Actor({ pos: vec(x, y), z: Z.marker });
      marker.graphics.use(ring);
      this.scene.add(marker);
      this.winMarkers.push(marker);
      // 少しずつずらして 2 回脈打つ
      return wait(i * 70).then(() =>
        tween(this.scene, 640, (t) => {
          const s = 1 + 0.15 * Math.sin(t * Math.PI * 2 * 2) ** 2;
          marker.scale = vec(s, s);
        }),
      );
    });
    await Promise.all(pulses);
  }

  /** ホバー表示を今の状態に合わせる */
  refreshHover(): void {
    this.setHover(this.hoverColumn);
  }

  private setHover(col: number | null): void {
    this.hoverColumn = col;
    const piece = this.input.previewPiece();
    const active = col !== null && piece !== null && this.input.clickableColumns().includes(col);
    this.columnGlow.graphics.isVisible = active;
    this.preview.graphics.isVisible = active;
    if (!active || col === null || piece === null) return;
    const x = columnCenterX(col);
    this.columnGlow.pos = vec(x, this.columnGlow.pos.y);
    this.preview.pos = vec(x, DROP_Y);
    this.preview.graphics.use(pieceGraphic(piece, PIECE_RADIUS));
  }

  private createPiece(index: number, piece: Piece): Actor {
    const { x, y } = BoardView.cellCenter(index);
    const actor = new Actor({ pos: vec(x, y), z: Z.piece });
    actor.graphics.use(pieceGraphic(piece, PIECE_RADIUS));
    this.scene.add(actor);
    return actor;
  }
}
