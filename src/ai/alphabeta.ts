import type { GameDefinition, PlayerId } from "../core/game";
import type { Evaluator } from "./types";

export interface SearchOptions {
  /** 読む最大の深さ */
  maxDepth: number;
  /** 思考時間の上限（ミリ秒）。省略すると深さだけで打ち切る */
  timeLimitMs?: number;
  /** 時計（テスト用に差し替え可能） */
  now?: () => number;
  /** 外部からの中断 */
  signal?: AbortSignal;
}

export interface SearchResult<M> {
  move: M;
  score: number;
  /** 最後まで読み切れた深さ */
  depth: number;
  nodes: number;
}

class SearchTimeout extends Error {}

/**
 * 反復深化つき αβ 探索。ゲームに依存しない汎用実装。
 * 手番が交互でないゲームにも対応するため、negamax ではなく
 * 「手番がルートのプレイヤーなら最大化」する minimax で書いている。
 */
export function searchBestMove<S, M, E>(
  game: GameDefinition<S, M, E>,
  root: S,
  evaluate: Evaluator<S>,
  options: SearchOptions,
): SearchResult<M> {
  const me: PlayerId | null = game.currentPlayer(root);
  const rootMoves = [...game.legalMoves(root)];
  if (me === null || rootMoves.length === 0) throw new Error("終局しているため手を選べません");

  const now = options.now ?? (() => Date.now());
  const deadline = options.timeLimitMs === undefined ? Infinity : now() + options.timeLimitMs;
  let nodes = 0;
  // 深さ制限で打ち切った葉があったか。無ければ終局まで読み切れている
  let hitDepthLimit: boolean;

  const checkTime = () => {
    if ((nodes & 255) === 0 && (now() > deadline || options.signal?.aborted)) {
      throw new SearchTimeout();
    }
  };

  const search = (state: S, depth: number, alpha: number, beta: number): number => {
    nodes++;
    checkTime();
    const player = game.currentPlayer(state);
    if (player === null) return evaluate(state, me);
    if (depth === 0) {
      hitDepthLimit = true;
      return evaluate(state, me);
    }
    const moves = game.legalMoves(state);
    if (player === me) {
      let value = -Infinity;
      for (const move of moves) {
        value = Math.max(value, search(game.applyMove(state, move).state, depth - 1, alpha, beta));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const move of moves) {
      value = Math.min(value, search(game.applyMove(state, move).state, depth - 1, alpha, beta));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  };

  // 1 手読みの評価で並べ替えておく（枝刈りが効きやすくなる）
  const children = rootMoves.map((move) => ({
    move,
    state: game.applyMove(root, move).state,
  }));
  children.sort((a, b) => evaluate(b.state, me) - evaluate(a.state, me));

  let best: SearchResult<M> = {
    move: (children[0] as { move: M }).move,
    score: -Infinity,
    depth: 0,
    nodes: 0,
  };

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    try {
      hitDepthLimit = false;
      let alpha = -Infinity;
      let bestMove = (children[0] as { move: M }).move;
      let bestScore = -Infinity;
      for (const child of children) {
        const score = search(child.state, depth - 1, alpha, Infinity);
        if (score > bestScore) {
          bestScore = score;
          bestMove = child.move;
        }
        alpha = Math.max(alpha, score);
      }
      best = { move: bestMove, score: bestScore, depth, nodes };
      // 前の深さの最善手を先頭に置く
      const index = children.findIndex((c) => c.move === bestMove);
      if (index > 0) children.unshift(...children.splice(index, 1));
      // 終局まで読み切れたら、それ以上深く読んでも結果は変わらない
      if (!hitDepthLimit) break;
    } catch (error) {
      if (error instanceof SearchTimeout) break;
      throw error;
    }
  }
  return { ...best, nodes };
}
