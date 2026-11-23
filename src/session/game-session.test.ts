import { describe, expect, it, vi } from "vitest";
import { IllegalMoveError } from "../core/errors";
import { fromNotation } from "../games/reversi/board";
import { reversi } from "../games/reversi/rules";
import type { ReversiMove } from "../games/reversi/types";
import { cpuController, humanController } from "./controllers";
import { GameSession } from "./game-session";

const place = (n: string): ReversiMove => ({ type: "place", index: fromNotation(n) });
const firstLegal = async (state: Parameters<typeof reversi.legalMoves>[0]) =>
  reversi.legalMoves(state)[0]!;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("GameSession（2 人対戦）", () => {
  it("手を指すと状態が進み、購読者に通知される", () => {
    const session = new GameSession(reversi, [humanController(), humanController()]);
    const listener = vi.fn();
    session.subscribe(listener);
    session.submit(place("d3"));
    expect(session.state.moveNumber).toBe(1);
    expect(session.currentPlayer).toBe(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "move", move: place("d3"), player: 0 }),
    );
    expect(session.history).toHaveLength(1);
  });

  it("合法手以外は拒否する", () => {
    const session = new GameSession(reversi, [humanController(), humanController()]);
    expect(() => session.submit(place("a1"))).toThrow(IllegalMoveError);
    expect(session.history).toHaveLength(0);
  });

  it("Undo で 1 手戻る", () => {
    const session = new GameSession(reversi, [humanController(), humanController()]);
    expect(session.canUndo()).toBe(false);
    session.submit(place("d3"));
    session.submit(place("c3"));
    session.undo();
    expect(session.state.moveNumber).toBe(1);
    expect(session.currentPlayer).toBe(1);
  });

  it("リセットで初期状態に戻る", () => {
    const session = new GameSession(reversi, [humanController(), humanController()]);
    session.submit(place("d3"));
    session.reset();
    expect(session.state.moveNumber).toBe(0);
    expect(session.history).toHaveLength(0);
  });
});

describe("GameSession（CPU 戦）", () => {
  it("CPU の手番になると自動で指す", async () => {
    const session = new GameSession(reversi, [humanController(), cpuController(firstLegal)]);
    session.start();
    session.submit(place("d3"));
    expect(session.isThinking).toBe(true);
    await flush();
    expect(session.state.moveNumber).toBe(2);
    expect(session.isHumanTurn()).toBe(true);
  });

  it("CPU が先手なら start で指し始める", async () => {
    const session = new GameSession(reversi, [cpuController(firstLegal), humanController()]);
    session.start();
    await flush();
    expect(session.state.moveNumber).toBe(1);
  });

  it("Undo すると人間の手番まで 2 手戻る", async () => {
    const session = new GameSession(reversi, [humanController(), cpuController(firstLegal)]);
    session.start();
    session.submit(place("d3"));
    await flush();
    session.submit(reversi.legalMoves(session.state)[0]!);
    await flush();
    expect(session.state.moveNumber).toBe(4);
    session.undo();
    expect(session.state.moveNumber).toBe(2);
    expect(session.isHumanTurn()).toBe(true);
  });

  it("CPU の思考中に Undo すると思考は破棄される", async () => {
    let resolveMove: ((m: ReversiMove) => void) | undefined;
    let aborted = false;
    const slow = cpuController<Parameters<typeof firstLegal>[0], ReversiMove>(
      (_state, signal) =>
        new Promise((resolve) => {
          resolveMove = resolve;
          signal.addEventListener("abort", () => (aborted = true));
        }),
    );
    const session = new GameSession(reversi, [humanController(), slow]);
    session.start();
    session.submit(place("d3"));
    session.undo();
    expect(aborted).toBe(true);
    resolveMove?.(place("c3"));
    await flush();
    expect(session.state.moveNumber).toBe(0);
  });
});
