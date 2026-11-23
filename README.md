# board-games

TypeScript で作るブラウザ向けボードゲーム集です。ルールは純粋な TypeScript で書き、描画にはゲームごとに別のエンジンを使っています。

| ゲーム | ページ | 描画エンジン |
| --- | --- | --- |
| リバーシ | `/`（`index.html`） | Phaser |
| 四目並べ | `/four-in-a-row.html` | Excalibur.js |

設計は [docs/design.md](docs/design.md) を参照してください。

## 遊び方

### リバーシ

- **2人で対戦**: 1 台の端末で交互に打ちます
- **CPUと対戦**: 強さ（弱・中・強）と自分の色（黒＝先手 / 白＝後手）を選べます
- 置ける場所には小さな点が表示されます。置ける場所がないときは自動でパスします
- 「1手戻す」で自分の手番まで戻れます（CPU 戦では CPU の手もまとめて戻ります）

### 四目並べ

- 7 列 × 6 段の盤に上から駒を落とし、縦・横・斜めのどれかに自分の駒を 4 つ並べたら勝ちです
- 盤が全部埋まっても並ばなければ引き分けです
- 列をクリック（タップ）するとその列に駒が落ちます。PC ではマウスを乗せた列に落とす駒が表示されます
- CPU の強さ: 弱（すぐ勝てるときだけ勝ちに行く）・中（4 手読み）・強（約 1 秒の αβ 探索）

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
  games/reversi/   リバーシのルール・評価関数・CPU（エンジン非依存）
  games/four-in-a-row/  四目並べのルール・評価関数・CPU（エンジン非依存）
  ai/              汎用の探索アルゴリズムと Web Worker（全ゲーム共通）
  session/         ゲーム進行（手番・履歴・Undo・CPU 呼び出し）
  ui/              リバーシの画面（Phaser に依存するのはここだけ）
  excalibur/       四目並べの画面（Excalibur.js に依存するのはここだけ）
e2e/               Playwright のテスト
```

`core` / `games` / `ai` / `session` から `phaser`・`excalibur`・`ui`・`excalibur/` を import すると ESLint がエラーにします。
同じ `session` / `ai` の仕組みの上に、別のエンジンで画面を載せられることを四目並べで確かめています。

## 公開（Cloudflare）

Cloudflare のダッシュボードで一度だけ設定すれば、`main` へのマージで自動公開されます。
デプロイ設定は `wrangler.jsonc` にあり、ビルド結果の `dist/` を静的サイトとして配信します。

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Import a repository**
2. リポジトリ `y4mas1ro/board-games` を選択
3. 設定
   - Project name: `board-games`（`wrangler.jsonc` の `name` と同じにする。変える場合は両方を合わせる）
   - Build command: `pnpm build`（空欄でも可。`wrangler.jsonc` の設定でデプロイ前に自動でビルドされる）
   - Deploy command: `npx wrangler deploy`（既定のまま）
   - 環境変数（Build variables）: `NODE_VERSION` = `22`
4. **Deploy**

※ リポジトリの `main` にこの設定ファイルがマージされている必要があります。マージ前にデプロイすると
「Could not detect a directory containing static files」というエラーになります。
