import { Scene } from "excalibur";
import { CPU_LEVEL_LABELS, type CpuLevel } from "../../ai/types";
import { setDebug } from "../debug";
import { loadSettings, saveSettings, type MatchSettings } from "../settings";
import { STRINGS } from "../strings";
import { COLORS, GAME_WIDTH, LAYOUT } from "../theme";
import { Button } from "../widgets/Button";
import { makeText } from "../widgets/text";

export class TitleScene extends Scene {
  private settings: MatchSettings = loadSettings();
  private refresh: () => void = () => {};

  override onActivate(): void {
    this.clear();
    setDebug({ scene: "title" });
    this.settings = loadSettings();
    this.build();
  }

  private build(): void {
    const L = LAYOUT.title;
    this.add(
      makeText(GAME_WIDTH / 2, 130, STRINGS.title, { size: 88, color: COLORS.text, bold: true }),
    );
    this.add(makeText(GAME_WIDTH / 2, 210, STRINGS.subtitle, { size: 26, color: COLORS.textDim }));

    const heading = (y: number, text: string) => {
      const label = makeText(GAME_WIDTH / 2, y, text, { size: 30, color: COLORS.textDim });
      this.add(label);
      return label;
    };
    heading(L.mode2p.y - 80, STRINGS.mode);
    const levelHeading = heading(L.levelWeak.y - 80, STRINGS.level);
    const colorHeading = heading(L.colorRed.y - 80, STRINGS.yourColor);

    const button = (
      pos: { x: number; y: number },
      label: string,
      options: ConstructorParameters<typeof Button>[3],
    ) => {
      const b = new Button(pos.x, pos.y, label, options);
      this.add(b);
      return b;
    };

    const mode2p = button(L.mode2p, STRINGS.mode2p, { onClick: () => this.patch({ mode: "2p" }) });
    const modeCpu = button(L.modeCpu, STRINGS.modeCpu, {
      onClick: () => this.patch({ mode: "cpu" }),
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
          button(pos, CPU_LEVEL_LABELS[level], {
            width: 150,
            fontSize: 36,
            onClick: () => this.patch({ level }),
          }),
        ] as [CpuLevel, Button],
    );
    const colorRed = button(L.colorRed, STRINGS.colorRed, {
      onClick: () => this.patch({ humanPiece: 1 }),
    });
    const colorYellow = button(L.colorYellow, STRINGS.colorYellow, {
      onClick: () => this.patch({ humanPiece: 2 }),
    });

    button(L.start, STRINGS.start, {
      width: 320,
      height: 100,
      fontSize: 40,
      onClick: () => {
        saveSettings(this.settings);
        void this.engine.goToScene("game", { sceneActivationData: this.settings });
      },
    });
    button(L.otherGame, STRINGS.otherGame, {
      width: 300,
      height: 64,
      fontSize: 26,
      onClick: () => {
        window.location.href = "./";
      },
    });

    this.refresh = () => {
      const s = this.settings;
      const cpu = s.mode === "cpu";
      mode2p.setSelected(!cpu);
      modeCpu.setSelected(cpu);
      for (const [level, b] of levelButtons)
        b.setEnabled(cpu).setSelected(cpu && s.level === level);
      colorRed.setEnabled(cpu).setSelected(cpu && s.humanPiece === 1);
      colorYellow.setEnabled(cpu).setSelected(cpu && s.humanPiece === 2);
      levelHeading.graphics.opacity = cpu ? 1 : 0.4;
      colorHeading.graphics.opacity = cpu ? 1 : 0.4;
    };
    this.refresh();
  }

  private patch(patch: Partial<MatchSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.refresh();
  }
}
