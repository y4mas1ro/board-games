import { thinkMove } from "./think";
import type { CpuLevel } from "./types";
import type { ThinkRequest, ThinkResponse, WorkerGameId, WorkerGames } from "./worker-protocol";

type Move = WorkerGames[WorkerGameId]["move"];

/**
 * Web Worker に思考を依頼するクライアント。
 * 中断されたら Worker ごと破棄し、次の依頼で作り直す（探索は同期処理で途中から止められないため）。
 */
export class CpuWorkerClient {
  private worker: Worker | null = null;
  private seq = 0;
  private readonly pending = new Map<
    number,
    { resolve: (move: Move) => void; reject: (error: unknown) => void }
  >();

  think<G extends WorkerGameId>(
    gameId: G,
    state: WorkerGames[G]["state"],
    level: CpuLevel,
    signal: AbortSignal,
  ): Promise<WorkerGames[G]["move"]> {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const request = { id: ++this.seq, gameId, state, level, seed } as Extract<
      ThinkRequest,
      { gameId: G }
    >;
    if (typeof Worker === "undefined") {
      return Promise.resolve(thinkMove<G>(request));
    }
    if (signal.aborted) return Promise.reject(signal.reason);
    const worker = this.ensureWorker();
    const { id } = request;
    return new Promise<WorkerGames[G]["move"]>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (move: Move) => void, reject });
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
