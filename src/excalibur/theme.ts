import { Color } from "excalibur";

export const FONT_FAMILY = '"Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';

export const HEX = {
  background: "#14213d",
  board: "#2a4d9b",
  boardEdge: "#1b326a",
  hole: "#0e1830",
  red: "#e0473c",
  redDark: "#a62d25",
  yellow: "#f4c542",
  yellowDark: "#b8901f",
  button: "#26375e",
  buttonHover: "#33497a",
  buttonSelected: "#f4c542",
  buttonDisabled: "#1d2a48",
  panel: "#1d2c50",
  highlight: "#ffffff",
  text: "#f3f1e8",
  textDim: "#a8b3cc",
  textDark: "#14213d",
  accent: "#ffd166",
} as const;

export const COLORS = {
  background: Color.fromHex(HEX.background),
  text: Color.fromHex(HEX.text),
  textDim: Color.fromHex(HEX.textDim),
  accent: Color.fromHex(HEX.accent),
} as const;

/** 論理解像度（DisplayMode.FitScreen で画面に合わせて拡大縮小） */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1080;

/** 盤面の配置（左上の座標とマスの大きさ） */
export const BOARD = {
  x: 38,
  y: 300,
  cell: 92,
} as const;

/** 駒を落とす前に表示する位置（盤の上） */
export const DROP_Y = BOARD.y - 58;

/** ボタンの配置（中心座標。E2E テストからも参照する） */
export const LAYOUT = {
  title: {
    mode2p: { x: 230, y: 360 },
    modeCpu: { x: 490, y: 360 },
    levelWeak: { x: 190, y: 540 },
    levelMedium: { x: 360, y: 540 },
    levelStrong: { x: 530, y: 540 },
    colorRed: { x: 230, y: 720 },
    colorYellow: { x: 490, y: 720 },
    start: { x: 360, y: 900 },
    otherGame: { x: 360, y: 1010 },
  },
  game: {
    undo: { x: 140, y: 960 },
    restart: { x: 360, y: 960 },
    title: { x: 580, y: 960 },
  },
  result: {
    again: { x: 230, y: 640 },
    title: { x: 490, y: 640 },
  },
} as const;
