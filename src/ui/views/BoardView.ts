import type Phaser from "phaser";
import { CELL_COUNT, colOf, rowOf, SIZE, toIndex } from "../../games/reversi/board";
import type { Cell, Disc } from "../../games/reversi/types";
import { BOARD, COLORS } from "../theme";
import { DiscView } from "./DiscView";

const DISC_RADIUS = BOARD.cell * 0.4;

/** 盤面・石・合法手ヒント・直前の手の表示を担当する */
export class BoardView {
  private readonly discs: (DiscView | null)[] = new Array<DiscView | null>(CELL_COUNT).fill(null);
  private readonly hints: Phaser.GameObjects.Graphics;
  private readonly lastMarker: Phaser.GameObjects.Arc;

  constructor(
    private readonly scene: Phaser.Scene,
    onCellClick: (index: number) => void,
  ) {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.boardEdge, 1);
    g.fillRoundedRect(BOARD.x - 14, BOARD.y - 14, BOARD.size + 28, BOARD.size + 28, 18);
    g.fillStyle(COLORS.board, 1);
    g.fillRect(BOARD.x, BOARD.y, BOARD.size, BOARD.size);
    g.lineStyle(2, COLORS.grid, 1);
    for (let i = 0; i <= SIZE; i++) {
      const p = i * BOARD.cell;
      g.lineBetween(BOARD.x + p, BOARD.y, BOARD.x + p, BOARD.y + BOARD.size);
      g.lineBetween(BOARD.x, BOARD.y + p, BOARD.x + BOARD.size, BOARD.y + p);
    }
    g.fillStyle(COLORS.grid, 1);
    for (const [r, c] of [
      [2, 2],
      [2, 6],
      [6, 2],
      [6, 6],
    ] as const) {
      g.fillCircle(BOARD.x + c * BOARD.cell, BOARD.y + r * BOARD.cell, 6);
    }

    this.hints = scene.add.graphics();
    this.lastMarker = scene.add.circle(0, 0, 7, COLORS.lastMove).setVisible(false).setDepth(2);

    const zone = scene.add
      .zone(BOARD.x, BOARD.y, BOARD.size, BOARD.size)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.worldX - BOARD.x) / BOARD.cell);
      const row = Math.floor((pointer.worldY - BOARD.y) / BOARD.cell);
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) onCellClick(toIndex(row, col));
    });
  }

  static cellCenter(index: number): { x: number; y: number } {
    return {
      x: BOARD.x + colOf(index) * BOARD.cell + BOARD.cell / 2,
      y: BOARD.y + rowOf(index) * BOARD.cell + BOARD.cell / 2,
    };
  }

  /** アニメーションなしで盤面全体を合わせる（Undo・リセット時） */
  setBoard(board: readonly Cell[]): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = board[i];
      const current = this.discs[i] ?? null;
      if (cell === 0 || cell === undefined) {
        current?.destroy();
        this.discs[i] = null;
      } else if (current) {
        current.setDisc(cell);
      } else {
        this.discs[i] = this.createDisc(i, cell);
      }
    }
  }

  async animatePlace(index: number, disc: Disc): Promise<void> {
    this.discs[index]?.destroy();
    const view = this.createDisc(index, disc);
    this.discs[index] = view;
    this.setLastMove(index);
    await view.appear();
  }

  async animateFlip(indices: readonly number[], to: Disc): Promise<void> {
    await Promise.all(
      indices.map((index, i) => this.discs[index]?.flip(to, i * 45) ?? Promise.resolve()),
    );
  }

  setHints(indices: readonly number[]): void {
    this.hints.clear();
    this.hints.fillStyle(COLORS.hint, 0.55);
    for (const index of indices) {
      const { x, y } = BoardView.cellCenter(index);
      this.hints.fillCircle(x, y, 10);
    }
  }

  setLastMove(index: number | null): void {
    if (index === null) {
      this.lastMarker.setVisible(false);
      return;
    }
    const { x, y } = BoardView.cellCenter(index);
    this.lastMarker.setPosition(x, y).setVisible(true);
  }

  private createDisc(index: number, disc: Disc): DiscView {
    const { x, y } = BoardView.cellCenter(index);
    return new DiscView(this.scene, x, y, DISC_RADIUS, disc);
  }
}
