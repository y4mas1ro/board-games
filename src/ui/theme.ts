export const FONT_FAMILY = '"Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';

export const COLORS = {
  background: 0x1b2a22,
  board: 0x2e7d4f,
  boardEdge: 0x14532d,
  grid: 0x14532d,
  black: 0x111111,
  white: 0xf5f5f5,
  discEdge: 0x000000,
  hint: 0x0b3d1e,
  lastMove: 0xe53935,
  button: 0x2f4a3b,
  buttonHover: 0x3d5f4c,
  buttonSelected: 0xd9a441,
  buttonDisabled: 0x26332c,
  panel: 0x22362b,
  text: "#f3f1e8",
  textDim: "#a9b8ad",
  textDark: "#1b2a22",
  accent: "#ffd166",
} as const;

/** 論理解像度（Scale.FIT で画面に合わせて拡大縮小） */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1080;

/** 盤面の配置 */
export const BOARD = {
  x: 40,
  y: 220,
  size: 640,
  cell: 80,
} as const;

/** ボタンの配置（E2E テストからも参照する） */
export const LAYOUT = {
  title: {
    mode2p: { x: 230, y: 340 },
    modeCpu: { x: 490, y: 340 },
    levelWeak: { x: 190, y: 520 },
    levelMedium: { x: 360, y: 520 },
    levelStrong: { x: 530, y: 520 },
    colorBlack: { x: 230, y: 700 },
    colorWhite: { x: 490, y: 700 },
    start: { x: 360, y: 900 },
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
