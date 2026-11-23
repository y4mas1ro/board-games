/// <reference lib="webworker" />
import { createRng } from "../core/random";
import { chooseReversiMove } from "../games/reversi/ai";
import type { ThinkRequest, ThinkResponse } from "./worker-protocol";

// CPU の思考は Web Worker 上で行い、描画が固まらないようにする
self.onmessage = (event: MessageEvent<ThinkRequest>) => {
  const { id, state, level, seed } = event.data;
  let response: ThinkResponse;
  try {
    response = { id, move: chooseReversiMove(state, level, createRng(seed)) };
  } catch (error) {
    response = { id, error: String(error) };
  }
  self.postMessage(response);
};
