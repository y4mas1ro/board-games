import Phaser from "phaser";
import { setDebug } from "../debug";
import type { MatchSettings } from "../settings";
import { STRINGS } from "../strings";
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, LAYOUT } from "../theme";
import { Button } from "../widgets/Button";

export interface ResultData {
  settings: MatchSettings;
  headline: string;
  score: string;
}

/** 終局時に GameScene の上に重ねて表示する */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: ResultData): void {
    const prev = window.__REVERSI__;
    setDebug({ ...prev, scene: "result" });

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.97);
    panel.fillRoundedRect(60, 360, GAME_WIDTH - 120, 360, 28);

    this.add
      .text(GAME_WIDTH / 2, 450, data.headline, {
        fontFamily: FONT_FAMILY,
        fontSize: "60px",
        fontStyle: "bold",
        color: COLORS.accent,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 530, data.score, {
        fontFamily: FONT_FAMILY,
        fontSize: "36px",
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const L = LAYOUT.result;
    new Button(this, L.again.x, L.again.y, STRINGS.playAgain, {
      width: 240,
      onClick: () => this.scene.start("GameScene", data.settings),
    });
    new Button(this, L.title.x, L.title.y, STRINGS.backToTitle, {
      width: 240,
      onClick: () => {
        this.scene.stop("GameScene");
        this.scene.start("TitleScene");
      },
    });
  }
}
