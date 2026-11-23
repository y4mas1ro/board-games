import Phaser from "phaser";
import { COLORS, FONT_FAMILY } from "../theme";

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  onClick: () => void;
}

/** 角丸のボタン。選択状態・無効状態を持つ */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly boxWidth: number;
  private readonly boxHeight: number;
  private hovered = false;
  private selected = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, options: ButtonOptions) {
    super(scene, x, y);
    this.boxWidth = options.width ?? 220;
    this.boxHeight = options.height ?? 84;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${options.fontSize ?? 32}px`,
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.zone = scene.add
      .zone(0, 0, this.boxWidth, this.boxHeight)
      .setInteractive({ useHandCursor: true });
    this.zone.on("pointerover", () => {
      this.hovered = true;
      this.redraw();
    });
    this.zone.on("pointerout", () => {
      this.hovered = false;
      this.redraw();
    });
    this.zone.on("pointerup", () => {
      if (this.enabled) options.onClick();
    });
    this.add([this.bg, this.label, this.zone]);
    scene.add.existing(this);
    this.redraw();
  }

  setSelected(selected: boolean): this {
    this.selected = selected;
    this.redraw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.redraw();
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  private redraw(): void {
    const color = !this.enabled
      ? COLORS.buttonDisabled
      : this.selected
        ? COLORS.buttonSelected
        : this.hovered
          ? COLORS.buttonHover
          : COLORS.button;
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(
      -this.boxWidth / 2,
      -this.boxHeight / 2,
      this.boxWidth,
      this.boxHeight,
      16,
    );
    this.label.setColor(
      !this.enabled ? COLORS.textDim : this.selected ? COLORS.textDark : COLORS.text,
    );
  }
}
