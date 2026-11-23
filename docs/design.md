# ボードゲーム基盤 & リバーシ 設計書

- ステータス: ドラフト（レビュー待ち）
- 対象: 最初のゲーム「リバーシ」と、将来のカードゲーム / RPG に流用できる共通基盤
- 本書は設計のみを扱い、実装は別 PR で行う

---

## 1. 目的とスコープ

### 目的
1. TypeScript でブラウザで遊べるリバーシを作る
2. その過程で「ルール（ロジック）」と「描画（UI）」を分離した構成を確立し、次のボードゲーム・カードゲーム・RPG（ターン制部分）でも再利用できるようにする

### 初版（v1）のスコープ
| 含む | 含まない（将来） |
| --- | --- |
| 8×8 の標準リバーシ | オンライン対戦 |
| 1 台で 2 人対戦（ホットシート） | アカウント / ランキング |
| CPU 対戦（弱・中・強の 3 段階） | 盤面サイズ変更などの変則ルール |
| 合法手ハイライト、裏返しアニメーション、パスの自動表示 | BGM・効果音の作り込み |
| 1 手戻す（Undo）、棋譜の保持 | 棋譜のファイル保存 / 読み込み |
| PC とスマホのブラウザ対応 | ネイティブアプリ化 |

---

## 2. 全体アーキテクチャ

「ルールは純粋な TypeScript、描画は Phaser」という 3 層構成にする。

```
┌──────────────────────────────────────────────┐
│ UI 層 (Phaser)                               │
│  Scene: Boot / Title / Game / Result         │
│  盤面描画・アニメーション・入力              │
└───────────────▲──────────────┬───────────────┘
                │ state / events│ move
┌───────────────┴──────────────▼───────────────┐
│ セッション層 (GameSession)                   │
│  現在の状態・履歴(Undo)・手番の進行          │
│  人間 / CPU のプレイヤー切り替え             │
└───────────────▲──────────────┬───────────────┘
                │ 純粋関数呼び出し             │
┌───────────────┴──────────────▼───────────────┐
│ ルール層 (core + games/reversi)              │
│  setup / legalMoves / applyMove / result     │
│  DOM・Phaser に一切依存しない                │
└──────────────────────────────────────────────┘
          ▲
          │ 同じ Game インターフェースを利用
┌─────────┴────────────────────────┐
│ AI 層 (Web Worker 上で実行)      │
│  ランダム / 貪欲 / αβ探索        │
└──────────────────────────────────┘
```

### 依存ルール（重要）
- `core` と `games/*` は **Phaser・DOM・ブラウザ API に依存しない**。Node 上のテストだけで完結する
- `ai` は `core` のインターフェースにのみ依存し、特定のゲームを知らない（評価関数だけゲーム側から渡す）
- `ui` は `games/*` を利用するが、逆方向の依存は禁止
- この制約は ESLint（`no-restricted-imports` もしくは dependency-cruiser）で CI 上で機械的にチェックする

この分離により、将来オンライン対戦を追加するときも、同じルール層をサーバー（Cloudflare Workers 等）でそのまま動かして不正防止の判定に使える。

---

## 3. ルールエンジン（core）

### 3.1 共通インターフェース

すべてのゲームは次の `GameDefinition` を実装する。状態は **イミュータブル**、関数はすべて **純粋関数**（同じ入力なら同じ出力）とする。

```ts
// src/core/game.ts
export type PlayerId = number; // 0, 1, ...

export interface GameDefinition<S, M, E = never> {
  id: string;                          // "reversi"
  setup(options: SetupOptions): S;     // 初期状態
  currentPlayer(state: S): PlayerId | null; // 終局なら null
  legalMoves(state: S): readonly M[];
  applyMove(state: S, move: M): MoveResult<S, E>;
  result(state: S): GameResult | null; // 終局前は null

  // 隠し情報を持つゲーム（カードゲーム等）用。リバーシでは state をそのまま返す
  playerView?(state: S, player: PlayerId): unknown;
}

export interface MoveResult<S, E> {
  state: S;
  events: readonly E[]; // UI のアニメーション用（例: 置いた・裏返した）
}

export type GameResult =
  | { kind: "win"; winner: PlayerId; scores?: readonly number[] }
  | { kind: "draw"; scores?: readonly number[] };

export interface SetupOptions {
  players: number;
  seed?: number; // 乱数を使うゲーム用（シャッフル等）
}
```

設計上のポイント:
- **`events` を返す**: UI は前後の状態を差分比較せず、ルール層が返す「何が起きたか」を見てアニメーションを再生する。カードゲームの「ドローした」「ダメージを受けた」にもそのまま使える
- **乱数はシード付き**: `core/random.ts` にシード可能な PRNG（mulberry32 等）を用意し、状態に乱数状態を含める。リプレイとテストの再現性を保証する
- **`playerView`**: 手札など相手に見せない情報の切り出し口。リバーシでは不要だが、インターフェースに最初から置いておく
- **不正な手は例外**: `applyMove` に合法手以外を渡したら `IllegalMoveError` を投げる。UI 側は `legalMoves` で事前に絞り込む

### 3.2 リバーシのデータ構造

```ts
// src/games/reversi/types.ts
export type Cell = 0 | 1 | 2;           // 0=空, 1=黒, 2=白
export type Disc = 1 | 2;

export interface ReversiState {
  readonly board: readonly Cell[];      // 長さ 64、index = row * 8 + col
  readonly turn: Disc;                  // 次に打つ色（黒が先手）
  readonly passCount: number;           // 連続パス数（2 で終局）
  readonly moveNumber: number;
}

export type ReversiMove =
  | { type: "place"; index: number }    // 0..63
  | { type: "pass" };                   // 合法手が無いときのみ合法

export type ReversiEvent =
  | { type: "placed"; index: number; disc: Disc }
  | { type: "flipped"; indices: readonly number[]; to: Disc }
  | { type: "passed"; disc: Disc };
```

- 盤面は最初は **長さ 64 の配列**（読みやすさ優先）。AI の速度が足りなくなった場合のみ、内部表現をビットボード（32bit×2）に差し替える。外部インターフェースは変えない
- **パスは明示的な手**として扱う。合法手が無いとき `legalMoves` は `[{type: "pass"}]` だけを返す。こうすると棋譜にパスが残り、UI でも「パスしました」を自然に表示できる

### 3.3 ルール

| 項目 | 仕様 |
| --- | --- |
| 初期配置 | d4・e5 に白、d5・e4 に黒（中央 4 マス、標準配置）。黒が先手 |
| 合法手 | 空きマスに置いて、8 方向のいずれかで相手の石を 1 個以上自分の石で挟めること |
| 裏返し | 挟んだ方向すべての相手の石を裏返す |
| パス | 合法手が無い場合のみ。合法手があるときはパス不可 |
| 終局 | 両者連続でパス（＝両者とも打てない）、または盤面が埋まったとき |
| 勝敗 | 石数の多い方が勝ち。同数は引き分け。空きマスは数えない（日本式の単純な数え方） |

### 3.4 主な関数
- `findFlips(board, index, disc): number[]` — その位置に置いたとき裏返る石（空なら非合法）
- `legalMoves(state)` — 64 マスを走査し `findFlips` が空でないマスを列挙。無ければ `pass`
- `applyMove(state, move)` — 新しい盤面を作り、`placed` / `flipped` / `passed` イベントを返す
- `result(state)` — 終局判定と石数カウント

---

## 4. セッション層（GameSession）

ルール層の純粋関数を「実際のゲーム進行」に結びつける薄い層。

```ts
// src/session/game-session.ts
class GameSession<S, M, E> {
  constructor(game: GameDefinition<S, M, E>, players: PlayerController<S, M>[]);
  get state(): S;
  get history(): readonly { state: S; move: M }[];
  submit(move: M): void;   // 合法性チェック → applyMove → 購読者に通知
  undo(): void;            // 人間の手番まで巻き戻す（CPU 戦では 2 手戻る）
  subscribe(listener: (s: S, events: E[]) => void): () => void;
}

interface PlayerController<S, M> {
  kind: "human" | "cpu" | "remote";
  // CPU は Web Worker に問い合わせ、remote は将来のオンライン対戦で使う
  requestMove?(state: S, signal: AbortSignal): Promise<M>;
}
```

- **パスの自動進行**: 人間の手番で合法手がパスだけのときは、UI に「パス」表示を出してから自動で `pass` を submit する
- **Undo**: 履歴に状態を積むだけで実装できる（状態がイミュータブルなので安全）
- `remote` を最初から型に入れておくことで、オンライン対戦追加時の変更範囲をこの層に閉じ込める

---

## 5. CPU（AI）

| 難易度 | アルゴリズム | 目安 |
| --- | --- | --- |
| 弱 | 合法手からランダム | 動作確認用・初心者向け |
| 中 | 1 手読み＋位置評価表（角が高く、角の隣が低い） | |
| 強 | αβ探索（反復深化、時間制限 1 秒程度）＋評価関数（位置評価・着手可能数・確定石） | 終盤 12 マス程度は完全読み |

- 探索アルゴリズム（`src/ai/`）は `GameDefinition` だけを使う汎用実装にし、評価関数をゲームごとに渡す。次のボードゲームでもそのまま使える
- 思考は **Web Worker** で実行し、描画が固まらないようにする。`AbortSignal` で Undo やリスタート時に思考を中断できるようにする
- CPU の着手には最低 300ms 程度の待ちを入れ、人間が手の流れを追えるようにする

---

## 6. UI（Phaser）

### 6.1 シーン構成
| Scene | 役割 |
| --- | --- |
| `BootScene` | アセット読み込み |
| `TitleScene` | モード選択（2 人対戦 / CPU 対戦）、先手後手・難易度選択 |
| `GameScene` | 盤面・石・手番表示・石数・Undo / リスタートボタン |
| `ResultScene` | 勝敗表示、もう一度 / タイトルへ（GameScene の上にオーバーレイ） |

### 6.2 描画と入力の流れ
1. プレイヤーがマスをタップ → `GameScene` が座標を `index` に変換
2. そのマスが `legalMoves` に含まれていれば `session.submit({type:"place", index})`
3. セッションが新しい状態と `events` を通知
4. `GameScene` は `events` を順にアニメーション再生（石を置く → 裏返る石を少しずつ時間差で回転）
5. アニメーション中は入力を受け付けない

- 盤面の見た目（石・盤）は最初は Phaser の `Graphics` による図形描画で作り、画像アセットは不要にする。後から差し替えられるよう、描画は `BoardView` / `DiscView` クラスに閉じ込める
- **レスポンシブ**: Phaser の `Scale.FIT` で縦長・横長どちらでも盤面が収まるようにする
- **表示**: 合法手は小さな点、直前の手はマーカーで強調。手番と石数は常時表示
- 文言は日本語。後から多言語化しやすいよう、表示文字列は `src/ui/strings.ts` に集約する

---

## 7. 技術スタック

| 用途 | 採用 | 理由 |
| --- | --- | --- |
| 言語 | TypeScript（`strict: true`） | |
| ゲームエンジン | Phaser（実装開始時点の最新安定版） | 2D ゲームの定番。シーン管理・トゥイーン・入力・スケーリングが揃っており、カードゲームや RPG にも流用できる |
| ビルド | Vite | Phaser 公式テンプレートもあり、開発サーバーが高速 |
| パッケージ管理 | pnpm | |
| 単体テスト | Vitest | Vite と設定を共有できる |
| プロパティテスト | fast-check | 「どんな合法手順でも石の総数は手数+4」などの不変条件の検証 |
| E2E テスト | Playwright | 起動して 1 局進められることの確認 |
| Lint / Format | ESLint + Prettier | 層の依存ルールのチェックも ESLint で行う |
| CI | GitHub Actions | PR ごとに型チェック・Lint・テスト・ビルド |
| ホスティング | Cloudflare Pages | 静的サイトとして無料で公開でき、PR ごとのプレビュー URL も出る |

※ boardgame.io も検討したが、更新が停滞気味であること、カードゲームや RPG まで広げると独自の制約が増えることから、ルール層は自前の小さなインターフェースにする。必要な考え方（純粋関数・`playerView`・イベント）は本設計に取り込んでいる。

---

## 8. ディレクトリ構成

最初は **単一パッケージ**で始め、ディレクトリと Lint ルールで層を分ける。ゲームが増えてビルドを分けたくなった段階で pnpm workspaces（`packages/core` 等）に分割する。

```
board-games/
├─ docs/
│  └─ design.md                 # 本書
├─ public/                      # 静的アセット（画像・音）
├─ src/
│  ├─ core/                     # ゲーム共通（Phaser 非依存）
│  │  ├─ game.ts                # GameDefinition などの型
│  │  ├─ random.ts              # シード付き乱数
│  │  └─ errors.ts
│  ├─ games/
│  │  └─ reversi/               # リバーシのルール（Phaser 非依存）
│  │     ├─ types.ts
│  │     ├─ board.ts            # 座標変換・方向・findFlips
│  │     ├─ rules.ts            # GameDefinition 実装
│  │     ├─ evaluate.ts         # AI 用評価関数
│  │     └─ __tests__/
│  ├─ ai/                       # 汎用探索（Phaser 非依存）
│  │  ├─ random-player.ts
│  │  ├─ alphabeta.ts
│  │  └─ worker.ts              # Web Worker エントリ
│  ├─ session/
│  │  └─ game-session.ts
│  ├─ ui/                       # Phaser 依存はここだけ
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ TitleScene.ts
│  │  │  ├─ GameScene.ts
│  │  │  └─ ResultScene.ts
│  │  ├─ views/
│  │  │  ├─ BoardView.ts
│  │  │  └─ DiscView.ts
│  │  └─ strings.ts
│  └─ main.ts                   # Phaser.Game の生成
├─ e2e/                         # Playwright
├─ .github/workflows/ci.yml
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

次のゲームを追加するときは `src/games/<name>/` と、必要なら `src/ui/scenes/<name>/` を足すだけ、を目標にする。

---

## 9. テスト方針

ルール層は UI と切り離されているので、**ロジックのテストを厚く、UI のテストは薄く**する。

1. **単体テスト（Vitest）**
   - 初期状態の合法手が d3・c4・f5・e6 の 4 つであること
   - 8 方向それぞれの裏返し、複数方向同時の裏返し、盤端で挟めないケース
   - パスが合法手のときだけ返ること、2 連続パスで終局すること
   - 勝敗・引き分け判定
2. **Perft テスト**: 初期局面から深さ N までの全手順数を数え、既知の値と照合する（深さ 1〜6 で 4 / 12 / 56 / 244 / 1,396 / 8,200 が既知の値。実装時に公開されている値と照合して確定する）。ルールの抜けを一網打尽にできる
3. **プロパティテスト（fast-check）**: ランダムな合法手順を打ち続けて
   - 石の総数 = 4 + 置いた回数
   - 盤面は常に 64 マス、値は 0/1/2 のみ
   - 必ず有限手数で終局する
4. **AI テスト**: 「角が取れる局面では角を取る」「「弱」に対して「強」が 100 戦で 95% 以上勝つ」など
5. **E2E（Playwright）**: ページを開き、CPU 戦を開始して数手打てること、終局画面まで到達できること
6. **CI**: `tsc --noEmit`、ESLint、Vitest、ビルドを PR ごとに実行。E2E はビルド後に実行

---

## 10. デプロイ

- `main` へのマージで Cloudflare Pages に自動デプロイ（ビルドコマンド `pnpm build`、出力 `dist/`）
- PR ごとにプレビュー URL が発行されるので、レビュー時に実機（スマホ含む）で確認できる
- 将来オンライン対戦を入れる場合は Cloudflare Workers + Durable Objects で部屋ごとの対局状態を持ち、**ルール層をサーバー側でも実行して手の正当性を判定**する

---

## 11. マイルストーン

| # | 内容 | 完了条件 |
| --- | --- | --- |
| M0 | プロジェクト雛形 | Vite + TS + Phaser で空画面が出る。CI（型・Lint・テスト・ビルド）が緑 |
| M1 | ルール層 | `core` と `games/reversi` 実装。単体・Perft・プロパティテストが通る |
| M2 | 2 人対戦 UI | ブラウザで最後まで 1 局遊べる（合法手表示・パス・終局表示） |
| M3 | セッション & Undo | 1 手戻す、リスタート、棋譜保持 |
| M4 | CPU 対戦 | 弱・中・強の 3 段階、Web Worker で思考 |
| M5 | 仕上げ & 公開 | アニメーション、スマホ対応、E2E、Cloudflare Pages へデプロイ |
| M6 | 振り返り | 次のゲーム（例: 五目並べ / 簡単なカードゲーム）を追加する前に、`core` の過不足を見直す |

M0〜M2 で「遊べるもの」が早めにできる順序にしている。

---

## 12. 将来の拡張への備え

| 将来のゲーム | この設計で再利用できるもの | 追加が必要になりそうなもの |
| --- | --- | --- |
| 他のボードゲーム（五目並べ・チェッカー等） | `core`、`ai` の αβ探索、`GameSession`、UI の盤面描画の考え方 | ゲームごとのルールと評価関数 |
| カードゲーム | `core`（`playerView`・シード付き乱数・events）、`GameSession` | 山札・手札・場のモデル、カード定義データ（JSON）、効果処理のスタック |
| RPG | ターン制バトル部分は `GameDefinition` としてそのまま表現可能。セーブは状態をシリアライズするだけ | フィールド移動はリアルタイム処理なので Phaser のシーン側で扱う。マップ（Tiled 等）、データ駆動のステータス・アイテム定義 |

---

## 13. 未決事項（要確認）

### 決定済み（2026-11-23）
- 初版に CPU 対戦を含める。難易度は弱・中・強の 3 段階
- オンライン対戦は当分不要。静的サイトとして公開する

### 未決
1. **ホスティング先**: Cloudflare Pages を推奨（他候補: GitHub Pages、itch.io）。Cloudflare アカウントの用意が必要
2. **見た目の方向性**: 最初は図形描画のシンプルなデザイン。イラストや効果音を入れるかは M5 で判断
3. **リポジトリ構成**: 単一パッケージで開始し、2 本目のゲーム追加時に workspaces 化を検討する案
