import type Phaser from "phaser";
import type { Disc } from "../../games/reversi/types";
import { COLORS } from "../theme";
import { tweenAsync } from "../tween";

const discColor = (disc: Disc) => (disc === 1 ? COLORS.black : COLORS.white);

/** 1 つの石。裏返しアニメーションを持つ */
export class DiscView {
  private readonly circle: Phaser.GameObjects.Arc;
  private disc: Disc;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    disc: Disc,
  ) {
    this.disc = disc;
    this.circle = scene.add.circle(x, y, radius, discColor(disc));
    this.circle.setStrokeStyle(2, COLORS.discEdge, 0.6);
  }

  get color(): Disc {
    return this.disc;
  }

  setDisc(disc: Disc): void {
    this.disc = disc;
    this.circle.setFillStyle(discColor(disc));
  }

  async appear(): Promise<void> {
    this.circle.setScale(0);
    await tweenAsync(this.scene, {
      targets: this.circle,
      scale: 1,
      duration: 160,
      ease: "Back.easeOut",
    });
  }

  /** 横方向に縮めて色を変え、元に戻す（コインを裏返すような動き） */
  async flip(to: Disc, delay = 0): Promise<void> {
    await tweenAsync(this.scene, {
      targets: this.circle,
      scaleX: 0,
      duration: 110,
      delay,
      ease: "Sine.easeIn",
    });
    this.setDisc(to);
    await tweenAsync(this.scene, {
      targets: this.circle,
      scaleX: 1,
      duration: 110,
      ease: "Sine.easeOut",
    });
  }

  destroy(): void {
    this.circle.destroy();
  }
}
