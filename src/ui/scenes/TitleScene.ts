import Phaser from "phaser";
import { CPU_LEVEL_LABELS, type CpuLevel } from "../../games/reversi/ai";
import { setDebug } from "../debug";
import { loadSettings, saveSettings, type MatchSettings } from "../settings";
import { STRINGS } from "../strings";
import { COLORS, FONT_FAMILY, GAME_WIDTH, LAYOUT } from "../theme";
import { Button } from "../widgets/Button";

export class TitleScene extends Phaser.Scene {
  private settings!: MatchSettings;

  constructor() {
    super("TitleScene");
  }

  create(): void {
    setDebug({ scene: "title" });
    this.settings = loadSettings();
    const L = LAYOUT.title;

    this.add
      .text(GAME_WIDTH / 2, 140, STRINGS.title, {
        fontFamily: FONT_FAMILY,
        fontSize: "88px",
        fontStyle: "bold",
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const heading = (y: number, text: string) =>
      this.add
        .text(GAME_WIDTH / 2, y, text, {
          fontFamily: FONT_FAMILY,
          fontSize: "30px",
          color: COLORS.textDim,
        })
        .setOrigin(0.5);

    heading(L.mode2p.y - 80, STRINGS.mode);
    const levelHeading = heading(L.levelWeak.y - 80, STRINGS.level);
    const colorHeading = heading(L.colorBlack.y - 80, STRINGS.yourColor);

    const mode2p = new Button(this, L.mode2p.x, L.mode2p.y, STRINGS.mode2p, {
      width: 240,
      onClick: () => this.patchSettings({ mode: "2p" }),
    });
    const modeCpu = new Button(this, L.modeCpu.x, L.modeCpu.y, STRINGS.modeCpu, {
      width: 240,
      onClick: () => this.patchSettings({ mode: "cpu" }),
    });

    const levelButtons = (
      [
        ["weak", L.levelWeak],
        ["medium", L.levelMedium],
        ["strong", L.levelStrong],
      ] as const
    ).map(
      ([level, pos]) =>
        [
          level,
          new Button(this, pos.x, pos.y, CPU_LEVEL_LABELS[level], {
            width: 150,
            fontSize: 36,
            onClick: () => this.patchSettings({ level }),
          }),
        ] as [CpuLevel, Button],
    );

    const colorBlack = new Button(this, L.colorBlack.x, L.colorBlack.y, STRINGS.colorBlack, {
      width: 240,
      onClick: () => this.patchSettings({ humanDisc: 1 }),
    });
    const colorWhite = new Button(this, L.colorWhite.x, L.colorWhite.y, STRINGS.colorWhite, {
      width: 240,
      onClick: () => this.patchSettings({ humanDisc: 2 }),
    });

    new Button(this, L.start.x, L.start.y, STRINGS.start, {
      width: 320,
      height: 100,
      fontSize: 40,
      onClick: () => {
        saveSettings(this.settings);
        this.scene.start("GameScene", this.settings);
      },
    });

    // Excalibur.js で作った四目並べのページへ
    new Button(this, L.otherGame.x, L.otherGame.y, STRINGS.otherGame, {
      width: 300,
      height: 64,
      fontSize: 26,
      onClick: () => {
        window.location.href = "./four-in-a-row.html";
      },
    });

    this.refresh = () => {
      const s = this.settings;
      const cpu = s.mode === "cpu";
      mode2p.setSelected(!cpu);
      modeCpu.setSelected(cpu);
      for (const [level, button] of levelButtons) {
        button.setEnabled(cpu).setSelected(cpu && s.level === level);
      }
      colorBlack.setEnabled(cpu).setSelected(cpu && s.humanDisc === 1);
      colorWhite.setEnabled(cpu).setSelected(cpu && s.humanDisc === 2);
      levelHeading.setAlpha(cpu ? 1 : 0.4);
      colorHeading.setAlpha(cpu ? 1 : 0.4);
    };
    this.refresh();
  }

  private refresh: () => void = () => {};

  private patchSettings(patch: Partial<MatchSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.refresh();
  }
}
