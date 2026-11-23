import { BaseAlign, Color, Font, FontUnit, Label, TextAlign, vec } from "excalibur";
import { FONT_FAMILY } from "../theme";

export interface TextOptions {
  size: number;
  color: Color;
  bold?: boolean;
  align?: "center" | "left";
}

/** 中央（または左）揃えの文字ラベルを作る */
export function makeText(x: number, y: number, text: string, options: TextOptions): Label {
  return new Label({
    pos: vec(x, y),
    text,
    z: 10,
    font: new Font({
      family: FONT_FAMILY,
      size: options.size,
      unit: FontUnit.Px,
      bold: options.bold ?? false,
      color: options.color,
      textAlign: options.align === "left" ? TextAlign.Left : TextAlign.Center,
      baseAlign: BaseAlign.Middle,
      quality: 3,
    }),
  });
}
