import { DisplayMode, Engine, PointerScope } from "excalibur";
import { GameScene } from "./scenes/GameScene";
import { TitleScene } from "./scenes/TitleScene";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./theme";

const game = new Engine({
  canvasElementId: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  displayMode: DisplayMode.FitScreen,
  backgroundColor: COLORS.background,
  // 高精細な画面でも 2 倍までに抑える（描画が重くなりすぎないように）
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  pointerScope: PointerScope.Canvas,
  suppressPlayButton: true,
  suppressConsoleBootMessage: true,
  scenes: {
    title: TitleScene,
    game: GameScene,
  },
});

void game.start("title");
