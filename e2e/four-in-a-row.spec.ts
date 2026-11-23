import { expect, test, type Page } from "@playwright/test";
import type { FourDebug } from "../src/excalibur/debug";
import { BOARD, GAME_WIDTH, LAYOUT } from "../src/excalibur/theme";

// CI のブラウザは GPU なしで描画するため、スマホ相当の高解像度では 1 フレームが重い。
// 実機より遅く動くので、このファイルだけ制限時間を長めにする
test.setTimeout(240_000);

/** 論理座標（720×1080）をキャンバス上の位置に変換してクリックする */
async function clickAt(page: Page, point: { x: number; y: number }) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("canvas が見つかりません");
  const scale = box.width / GAME_WIDTH;
  await page.mouse.click(box.x + point.x * scale, box.y + point.y * scale);
}

/** 列の真ん中あたり（盤の中）をクリックする位置 */
const columnPoint = (col: number) => ({
  x: BOARD.x + col * BOARD.cell + BOARD.cell / 2,
  y: BOARD.y + BOARD.cell * 3,
});

const debug = (page: Page) =>
  page.evaluate(() => {
    const d = window.__FOUR__ as FourDebug | undefined;
    return d
      ? { scene: d.scene, state: d.getState?.() ?? null, busy: d.isBusy?.() ?? false }
      : null;
  });

async function waitForScene(page: Page, scene: FourDebug["scene"]) {
  await expect.poll(async () => (await debug(page))?.scene, { timeout: 30_000 }).toBe(scene);
}

const moveNumber = async (page: Page) => (await debug(page))?.state?.moveNumber ?? 0;

/** 人間の手番なら、落とせる列のうち最初の列に落とす */
async function playFirstLegal(page: Page): Promise<boolean> {
  const col = await page.evaluate(() => window.__FOUR__?.humanMoves?.()[0] ?? -1);
  if (col < 0) return false;
  const before = await moveNumber(page);
  await clickAt(page, columnPoint(col));
  await expect.poll(() => moveNumber(page), { timeout: 10_000 }).toBeGreaterThan(before);
  return true;
}

test("タイトルから CPU（弱）と最後まで対局できる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/four-in-a-row.html");
  await waitForScene(page, "title");

  const L = LAYOUT.title;
  await clickAt(page, L.modeCpu);
  await clickAt(page, L.levelWeak);
  await clickAt(page, L.colorRed);
  await clickAt(page, L.start);
  await waitForScene(page, "game");

  // 中央の列に落とすと一番下に止まる
  await clickAt(page, columnPoint(3));
  await expect.poll(() => moveNumber(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  expect((await debug(page))?.state?.board[5 * 7 + 3]).toBe(1);

  for (let i = 0; i < 100; i++) {
    if ((await debug(page))?.scene === "result") break;
    // CPU の思考・アニメーションの間は待つ
    if (!(await playFirstLegal(page))) await page.waitForTimeout(250);
  }
  await waitForScene(page, "result");
  expect(errors).toEqual([]);

  // もう一度 → 新しい対局が始まる
  await clickAt(page, LAYOUT.result.again);
  await waitForScene(page, "game");
  expect(await moveNumber(page)).toBe(0);
});

test("2 人対戦で 1 手戻すが使え、決着すると結果が出る", async ({ page }) => {
  await page.goto("/four-in-a-row.html");
  await waitForScene(page, "title");
  await clickAt(page, LAYOUT.title.mode2p);
  await clickAt(page, LAYOUT.title.start);
  await waitForScene(page, "game");

  const drop = async (col: number, expected: number) => {
    await expect.poll(async () => (await debug(page))?.busy).toBe(false);
    await clickAt(page, columnPoint(col));
    await expect.poll(() => moveNumber(page)).toBe(expected);
  };
  await drop(0, 1); // 赤
  await drop(0, 2); // 黄
  await expect.poll(async () => (await debug(page))?.busy).toBe(false);
  await clickAt(page, LAYOUT.game.undo);
  await expect.poll(() => moveNumber(page)).toBe(1);
  await expect.poll(async () => (await debug(page))?.state?.turn).toBe(2);

  // 赤が一番下の段の 0〜3 列目に並べて勝つ（黄はその上に積む）
  await drop(0, 2); // 黄
  await drop(1, 3); // 赤
  await drop(1, 4); // 黄
  await drop(2, 5); // 赤
  await drop(2, 6); // 黄
  await drop(3, 7); // 赤
  await waitForScene(page, "result");
  expect((await debug(page))?.state?.winLine).toEqual([35, 36, 37, 38]);
});
