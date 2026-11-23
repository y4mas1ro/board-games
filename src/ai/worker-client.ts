import { createRng } from "../core/random";
import { chooseReversiMove, type CpuLevel } from "../games/reversi/ai";
import type { ReversiMove, ReversiState } from "../games/reversi/types";
import type { ThinkRequest, ThinkResponse } from "./worker-protocol";

/**
 * Web Worker に思考を依頼するクライアント。
 * 中断されたら Worker ごと破棄し、次の依頼で作り直す（探索は同期処理で途中から止められないため）。
 */
export class CpuWorkerClient {
  private worker: Worker | null = null;
  private seq = 0;
  private readonly pending = new Map<
    number,
    { resolve: (move: ReversiMove) => void; reject: (error: unknown) => void }
  >();

  think(state: ReversiState, level: CpuLevel, signal: AbortSignal): Promise<ReversiMove> {
    const seed = Math.floor(Math.random() * 2 ** 31);
    if (typeof Worker === "undefined") {
      return Promise.resolve(chooseReversiMove(state, level, createRng(seed)));
    }
    if (signal.aborted) return Promise.reject(signal.reason);
    const worker = this.ensureWorker();
    const id = ++this.seq;
    return new Promise<ReversiMove>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      signal.addEventListener(
        "abort",
        () => {
          if (!this.pending.has(id)) return;
          this.pending.delete(id);
          this.terminate();
          reject(signal.reason);
        },
        { once: true },
      );
      const request: ThinkRequest = { id, gameId: "reversi", state, level, seed };
      worker.postMessage(request);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const { reject } of this.pending.values()) reject(new Error("worker terminated"));
    this.pending.clear();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ThinkResponse>) => {
      const data = event.data;
      const entry = this.pending.get(data.id);
      if (!entry) return;
      this.pending.delete(data.id);
      if ("move" in data) entry.resolve(data.move);
      else entry.reject(new Error(data.error));
    };
    worker.onerror = (event) => {
      for (const { reject } of this.pending.values()) reject(new Error(event.message));
      this.pending.clear();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }
}
