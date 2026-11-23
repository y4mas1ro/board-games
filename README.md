# board-games

TypeScript と Phaser で作るブラウザ向けボードゲーム集です。最初のゲームはリバーシです。

設計は [docs/design.md](docs/design.md) を参照してください。

## 遊び方

- **2人で対戦**: 1 台の端末で交互に打ちます
- **CPUと対戦**: 強さ（弱・中・強）と自分の色（黒＝先手 / 白＝後手）を選べます
- 置ける場所には小さな点が表示されます。置ける場所がないときは自動でパスします
- 「1手戻す」で自分の手番まで戻れます（CPU 戦では CPU の手もまとめて戻ります）

## 開発

必要なもの: Node.js 22 以上、pnpm 10

```sh
pnpm install
pnpm dev          # 開発サーバー（http://localhost:5173）
pnpm test         # 単体テスト（Vitest）
pnpm e2e          # E2E テスト（Playwright。初回は pnpm exec playwright install chromium）
pnpm lint         # ESLint（層の依存ルールもチェック）
pnpm typecheck    # 型チェック
pnpm build        # 本番ビルド（dist/）
```

## ディレクトリ構成

```
src/
  core/            ゲーム共通の型・乱数（Phaser 非依存）
  games/reversi/   リバーシのルール・評価関数・CPU（Phaser 非依存）
  ai/              汎用の探索アルゴリズムと Web Worker
  session/         ゲーム進行（手番・履歴・Undo・CPU 呼び出し）
  ui/              Phaser のシーン・描画（Phaser に依存するのはここだけ）
e2e/               Playwright のテスト
```

`core` / `games` / `ai` / `session` から `phaser` や `ui` を import すると ESLint がエラーにします。

## 公開（Cloudflare Pages）

Cloudflare のダッシュボードで一度だけ設定すれば、`main` へのマージで自動公開され、PR ごとにプレビュー URL も発行されます。

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. リポジトリ `y4mas1ro/board-games` を選択
3. ビルド設定
   - Framework preset: `None`
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - 環境変数: `NODE_VERSION` = `22`
4. **Save and Deploy**
