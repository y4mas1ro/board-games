import { expect, test, type Page } from "@playwright/test";
import { BOARD, GAME_WIDTH, LAYOUT } from "../src/ui/theme";
import type { ReversiDebug } from "../src/ui/debug";

/** 論理座標（720×1080）をキャンバス上の位置に変換してクリックする */
async function clickAt(page: Page, point: { x: number; y: number }) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("canvas が見つかりません");
  const scale = box.width / GAME_WIDTH;
  await page.mouse.click(box.x + point.x * scale, box.y + point.y * scale);
}

const cellCenter = (index: number) => ({
  x: BOARD.x + (index % 8) * BOARD.cell + BOARD.cell / 2,
  y: BOARD.y + Math.floor(index / 8) * BOARD.cell + BOARD.cell / 2,
});

const debug = (page: Page) =>
  page.evaluate(() => {
    const d = window.__REVERSI__ as ReversiDebug | undefined;
    return d
      ? { scene: d.scene, state: d.getState?.() ?? null, busy: d.isBusy?.() ?? false }
      : null;
  });

async function waitForScene(page: Page, scene: ReversiDebug["scene"]) {
  await expect.poll(async () => (await debug(page))?.scene, { timeout: 30_000 }).toBe(scene);
}

/** 人間の手番なら、置ける場所のうち最初のマスに打つ */
async function playFirstLegal(page: Page): Promise<boolean> {
  const index = await page.evaluate(() => window.__REVERSI__?.humanMoves?.()[0] ?? -1);
  if (index < 0) return false;
  const before = (await debug(page))?.state?.moveNumber ?? 0;
  await clickAt(page, cellCenter(index));
  await expect
    .poll(async () => (await debug(page))?.state?.moveNumber ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(before);
  return true;
}

test("タイトルから CPU（弱）と最後まで対局できる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await waitForScene(page, "title");

  const L = LAYOUT.title;
  await clickAt(page, L.modeCpu);
  await clickAt(page, L.levelWeak);
  await clickAt(page, L.colorBlack);
  await clickAt(page, L.start);
  await waitForScene(page, "game");

  // 初手 d3 を打つと、石が 4 対 1 になる
  await clickAt(page, cellCenter(19));
  await expect
    .poll(async () => (await debug(page))?.state?.moveNumber ?? 0, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);

  for (let i = 0; i < 400; i++) {
    if ((await debug(page))?.scene === "result") break;
    // CPU の思考・アニメーション・自動パスの間は待つ
    if (!(await playFirstLegal(page))) await page.waitForTimeout(250);
  }
  await waitForScene(page, "result");
  expect(errors).toEqual([]);

  // もう一度 → 新しい対局が始まる
  await clickAt(page, LAYOUT.result.again);
  await waitForScene(page, "game");
  expect((await debug(page))?.state?.moveNumber).toBe(0);
});

test("2 人対戦で 1 手戻すが使える", async ({ page }) => {
  await page.goto("/");
  await waitForScene(page, "title");
  await clickAt(page, LAYOUT.title.mode2p);
  await clickAt(page, LAYOUT.title.start);
  await waitForScene(page, "game");

  await clickAt(page, cellCenter(19)); // 黒 d3
  await expect.poll(async () => (await debug(page))?.state?.turn).toBe(2);
  await expect.poll(async () => (await debug(page))?.busy).toBe(false);
  await clickAt(page, cellCenter(18)); // 白 c3
  await expect.poll(async () => (await debug(page))?.state?.moveNumber).toBe(2);
  await expect.poll(async () => (await debug(page))?.busy).toBe(false);

  await clickAt(page, LAYOUT.game.undo);
  await expect.poll(async () => (await debug(page))?.state?.moveNumber).toBe(1);
  await expect.poll(async () => (await debug(page))?.state?.turn).toBe(2);

  // 置けない場所をクリックしても何も起きない
  await clickAt(page, cellCenter(0));
  await page.waitForTimeout(300);
  expect((await debug(page))?.state?.moveNumber).toBe(1);
});
