import type { CpuLevel } from "../ai/types";
import type { Piece } from "../games/four-in-a-row/types";

export interface MatchSettings {
  mode: "2p" | "cpu";
  level: CpuLevel;
  /** CPU 戦での人間の色 */
  humanPiece: Piece;
}

export const DEFAULT_SETTINGS: MatchSettings = { mode: "cpu", level: "medium", humanPiece: 1 };

const STORAGE_KEY = "four-in-a-row.settings";

/** 前回の設定を覚えておく（使えない環境では既定値） */
export function loadSettings(): MatchSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MatchSettings>;
    return {
      mode: parsed.mode === "2p" ? "2p" : "cpu",
      level:
        parsed.level === "weak" || parsed.level === "strong"
          ? parsed.level
          : DEFAULT_SETTINGS.level,
      humanPiece: parsed.humanPiece === 2 ? 2 : 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: MatchSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても遊べるので無視する
  }
}
