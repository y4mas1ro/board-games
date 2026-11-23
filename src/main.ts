import Phaser from "phaser";
import { BootScene } from "./ui/scenes/BootScene";
import { GameScene } from "./ui/scenes/GameScene";
import { ResultScene } from "./ui/scenes/ResultScene";
import { TitleScene } from "./ui/scenes/TitleScene";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./ui/theme";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});
