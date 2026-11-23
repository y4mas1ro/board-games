import { describe, expect, it } from "vitest";
import { IllegalMoveError } from "../../../core/errors";
import { CELL_COUNT, findLine, parseBoard, toIndex } from "../board";
import { createInitialState, fourInARow } from "../rules";
import { RED, YELLOW, type FourState } from "../types";

/** 列番号の並びを順に指す */
function play(columns: readonly number[], from: FourState = createInitialState()): FourState {
  return columns.reduce((state, column) => fourInARow.applyMove(state, { column }).state, from);
}

describe("四目並べのルール", () => {
  it("初期状態は空の盤で赤の番", () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(CELL_COUNT);
    expect(state.board.every((c) => c === 0)).toBe(true);
    expect(fourInARow.currentPlayer(state)).toBe(0);
    expect(fourInARow.legalMoves(state)).toHaveLength(7);
    expect(fourInARow.result(state)).toBeNull();
  });

  it("駒は列の一番下に落ち、手番が交代する", () => {
    const { state, events } = fourInARow.applyMove(createInitialState(), { column: 3 });
    expect(state.board[toIndex(5, 3)]).toBe(RED);
    expect(state.turn).toBe(YELLOW);
    expect(events).toEqual([
      { type: "dropped", column: 3, row: 5, index: toIndex(5, 3), piece: RED },
    ]);
    const next = fourInARow.applyMove(state, { column: 3 }).state;
    expect(next.board[toIndex(4, 3)]).toBe(YELLOW);
  });

  it("満杯の列には落とせない", () => {
    const full = play([0, 0, 0, 0, 0, 0]);
    expect(fourInARow.legalMoves(full).some((m) => m.column === 0)).toBe(false);
    expect(() => fourInARow.applyMove(full, { column: 0 })).toThrow(IllegalMoveError);
    expect(() => fourInARow.applyMove(full, { column: 7 })).toThrow(IllegalMoveError);
    expect(() => fourInARow.applyMove(full, { column: 1.5 })).toThrow(IllegalMoveError);
  });

  it("横に 4 つ並ぶと勝ち", () => {
    const { state, events } = fourInARow.applyMove(play([0, 0, 1, 1, 2, 2]), { column: 3 });
    expect(state.winLine).toEqual([35, 36, 37, 38]);
    expect(events[1]).toEqual({ type: "connected", indices: [35, 36, 37, 38], piece: RED });
    expect(fourInARow.result(state)).toEqual({ kind: "win", winner: 0 });
    expect(fourInARow.currentPlayer(state)).toBeNull();
    expect(fourInARow.legalMoves(state)).toEqual([]);
    expect(() => fourInARow.applyMove(state, { column: 4 })).toThrow(IllegalMoveError);
  });

  it("縦に 4 つ並ぶと勝ち（後手）", () => {
    const state = play([0, 1, 0, 1, 0, 1, 2, 1]);
    expect(fourInARow.result(state)).toEqual({ kind: "win", winner: 1 });
  });

  it("斜めの並びと、5 つ以上の並びを見つける", () => {
    const diagonal = parseBoard(`
      .......
      .......
      ...R...
      ..RY...
      .RYY...
      RYYR...
    `);
    expect(findLine(diagonal, toIndex(2, 3))).toEqual([
      toIndex(2, 3),
      toIndex(3, 2),
      toIndex(4, 1),
      toIndex(5, 0),
    ]);
    const five = parseBoard(`
      .......
      .......
      .......
      .......
      .......
      RRRRR..
    `);
    expect(findLine(five, toIndex(5, 2))).toHaveLength(5);
    expect(findLine(five, toIndex(4, 2))).toBeNull();
  });

  it("盤が埋まって並びがなければ引き分け", () => {
    // 列ごとに 3 個ずつ交互に積むと 4 つ並ばない並べ方
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0];
    const columns = [
      ...order,
      ...order.map((c) => c + 2),
      ...order.map((c) => c + 4),
      6,
      6,
      6,
      6,
      6,
      6,
    ];
    let state = createInitialState();
    for (const column of columns) {
      expect(fourInARow.result(state)).toBeNull();
      state = fourInARow.applyMove(state, { column }).state;
    }
    expect(state.moveNumber).toBe(CELL_COUNT);
    expect(fourInARow.result(state)).toEqual({ kind: "draw" });
  });
});
