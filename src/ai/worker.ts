/// <reference lib="webworker" />
import { thinkMove } from "./think";
import type { ThinkRequest, ThinkResponse } from "./worker-protocol";

// CPU の思考は Web Worker 上で行い、描画が固まらないようにする
self.onmessage = (event: MessageEvent<ThinkRequest>) => {
  const { id } = event.data;
  let response: ThinkResponse;
  try {
    response = { id, move: thinkMove(event.data) };
  } catch (error) {
    response = { id, error: String(error) };
  }
  self.postMessage(response);
};
