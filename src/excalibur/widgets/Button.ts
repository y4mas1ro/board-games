import { Actor, Canvas, vec, type Engine } from "excalibur";
import { FONT_FAMILY, HEX } from "../theme";

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  onClick: () => void;
}

/**
 * 角丸のボタン。選択中・無効・ホバーの見た目を切り替えられる。
 * 背景と文字は 1 枚の Canvas に描き、状態が変わったときだけ描き直す。
 */
export class Button extends Actor {
  private enabled = true;
  private selected = false;
  private hovered = false;
  private readonly canvas: Canvas;

  constructor(
    x: number,
    y: number,
    private label: string,
    private readonly options: ButtonOptions,
  ) {
    const width = options.width ?? 240;
    const height = options.height ?? 84;
    super({ pos: vec(x, y), width, height, z: 10 });
    const fontSize = options.fontSize ?? 32;
    this.canvas = new Canvas({
      width,
      height,
      cache: true,
      quality: 2,
      draw: (ctx) => {
        const fill = !this.enabled
          ? HEX.buttonDisabled
          : this.selected
            ? HEX.buttonSelected
            : this.hovered
              ? HEX.buttonHover
              : HEX.button;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 18);
        ctx.fill();
        ctx.fillStyle = this.selected ? HEX.textDark : this.enabled ? HEX.text : HEX.textDim;
        ctx.globalAlpha = this.enabled ? 1 : 0.6;
        ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.label, width / 2, height / 2 + 2);
        ctx.globalAlpha = 1;
      },
    });
    this.graphics.use(this.canvas);
  }

  override onInitialize(engine: Engine): void {
    const setCursor = (cursor: string) => (engine.canvas.style.cursor = cursor);
    this.on("pointerenter", () => {
      this.hovered = true;
      if (this.enabled) setCursor("pointer");
      this.canvas.flagDirty();
    });
    this.on("pointerleave", () => {
      this.hovered = false;
      setCursor("default");
      this.canvas.flagDirty();
    });
    this.on("pointerup", () => {
      if (this.enabled) this.options.onClick();
    });
    this.on("kill", () => setCursor("default"));
  }

  setEnabled(enabled: boolean): this {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.canvas.flagDirty();
    }
    return this;
  }

  setSelected(selected: boolean): this {
    if (this.selected !== selected) {
      this.selected = selected;
      this.canvas.flagDirty();
    }
    return this;
  }

  setLabel(label: string): this {
    this.label = label;
    this.canvas.flagDirty();
    return this;
  }
}
