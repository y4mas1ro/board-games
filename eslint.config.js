import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// 層の依存ルール（docs/design.md 2章）:
// core / games / ai / session は Phaser・Excalibur・UI に依存してはいけない
const noUiImports = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        { name: "phaser", message: "ルール層・AI・セッションは Phaser に依存できません" },
        { name: "excalibur", message: "ルール層・AI・セッションは Excalibur に依存できません" },
      ],
      patterns: [
        {
          group: ["**/ui/**", "**/ui", "**/excalibur/**", "**/excalibur"],
          message: "ルール層から UI へは依存できません",
        },
      ],
    },
  ],
};

export default tseslint.config(
  { ignores: ["dist", "node_modules", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["src/core/**", "src/games/**", "src/ai/**", "src/session/**"],
    rules: noUiImports,
  },
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "phaser", message: "core は Phaser に依存できません" },
            { name: "excalibur", message: "core は Excalibur に依存できません" },
          ],
          patterns: [
            {
              group: ["**/ui/**", "**/excalibur/**", "**/games/**", "**/ai/**", "**/session/**"],
              message: "core は他の層に依存できません",
            },
          ],
        },
      ],
    },
  },
);
