import { Canvas } from "excalibur";
import type { Piece } from "../../games/four-in-a-row/types";
import { HEX } from "../theme";

/** 駒の絵（色ごとに 1 枚を使い回す） */
const pieceCache = new Map<string, Canvas>();

export function pieceGraphic(piece: Piece, radius: number): Canvas {
  const key = `${piece}:${radius}`;
  const cached = pieceCache.get(key);
  if (cached) return cached;
  const size = radius * 2;
  const [light, dark] = piece === 1 ? [HEX.red, HEX.redDark] : [HEX.yellow, HEX.yellowDark];
  const canvas = new Canvas({
    width: size,
    height: size,
    cache: true,
    quality: 2,
    draw: (ctx) => {
      const c = radius;
      const gradient = ctx.createRadialGradient(c * 0.7, c * 0.6, radius * 0.1, c, c, radius);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(c, c, radius, 0, Math.PI * 2);
      ctx.fill();
      // 内側の溝
      ctx.strokeStyle = dark;
      ctx.lineWidth = radius * 0.08;
      ctx.beginPath();
      ctx.arc(c, c, radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
    },
  });
  pieceCache.set(key, canvas);
  return canvas;
}

/** 角丸の四角形 */
export function roundedRect(
  width: number,
  height: number,
  radius: number,
  color: string,
  alpha = 1,
): Canvas {
  return new Canvas({
    width,
    height,
    cache: true,
    draw: (ctx) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, radius);
      ctx.fill();
    },
  });
}

/** 輪（勝ちの並びや直前の手の目印） */
export function ringGraphic(radius: number, color: string, lineWidth: number): Canvas {
  const size = radius * 2 + lineWidth * 2;
  return new Canvas({
    width: size,
    height: size,
    cache: true,
    quality: 2,
    draw: (ctx) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    },
  });
}
