import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    // ゲームごとに別ページ（リバーシ = Phaser、四目並べ = Excalibur.js）
    rolldownOptions: {
      input: {
        reversi: resolve(import.meta.dirname, "index.html"),
        fourInARow: resolve(import.meta.dirname, "four-in-a-row.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
