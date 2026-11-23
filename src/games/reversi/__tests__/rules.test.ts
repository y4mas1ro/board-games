import { describe, expect, it } from "vitest";
import { IllegalMoveError } from "../../../core/errors";
import { countDiscs, findFlips, fromNotation, parseBoard, toNotation } from "../board";
import { createInitialState, isTerminal, reversi } from "../rules";
import { BLACK, WHITE, type ReversiMove, type ReversiState } from "../types";

const place = (notation: string): ReversiMove => ({ type: "place", index: fromNotation(notation) });
const notations = (state: ReversiState) =>
  reversi
    .legalMoves(state)
    .map((m) => (m.type === "place" ? toNotation(m.index) : "pass"))
    .sort();

describe("初期状態", () => {
  const state = createInitialState();

  it("中央 4 マスに標準配置され、黒が先手", () => {
    expect(state.board[fromNotation("d4")]).toBe(WHITE);
    expect(state.board[fromNotation("e5")]).toBe(WHITE);
    expect(state.board[fromNotation("e4")]).toBe(BLACK);
    expect(state.board[fromNotation("d5")]).toBe(BLACK);
    expect(countDiscs(state.board)).toEqual({ black: 2, white: 2, empty: 60 });
    expect(state.turn).toBe(BLACK);
    expect(reversi.currentPlayer(state)).toBe(0);
  });

  it("合法手は d3・c4・f5・e6 の 4 つ", () => {
    expect(notations(state)).toEqual(["c4", "d3", "e6", "f5"]);
  });

  it("終局していない", () => {
    expect(reversi.result(state)).toBeNull();
  });
});

describe("着手と裏返し", () => {
  it("d3 に置くと d4 が裏返り、手番が白に移る", () => {
    const { state, events } = reversi.applyMove(createInitialState(), place("d3"));
    expect(state.board[fromNotation("d3")]).toBe(BLACK);
    expect(state.board[fromNotation("d4")]).toBe(BLACK);
    expect(countDiscs(state.board)).toEqual({ black: 4, white: 1, empty: 59 });
    expect(state.turn).toBe(WHITE);
    expect(state.moveNumber).toBe(1);
    expect(events).toEqual([
      { type: "placed", index: fromNotation("d3"), disc: BLACK },
      { type: "flipped", indices: [fromNotation("d4")], to: BLACK },
    ]);
  });

  it("元の状態は変更されない（イミュータブル）", () => {
    const before = createInitialState();
    const snapshot = [...before.board];
    reversi.applyMove(before, place("d3"));
    expect(before.board).toEqual(snapshot);
  });

  it("8 方向すべてを同時に裏返せる", () => {
    const board = parseBoard(`
      ........
      .B.B.B..
      ..WWW...
      .BW.WB..
      ..WWW...
      .B.B.B..
      ........
      ........
    `);
    const flips = findFlips(board, fromNotation("d4"), BLACK).map(toNotation).sort();
    expect(flips).toEqual(["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"]);
  });

  it("盤端で挟めない場合は裏返らない", () => {
    const board = parseBoard(`
      WWWWWWW.
      ........
      ........
      ........
      ........
      ........
      ........
      ........
    `);
    expect(findFlips(board, fromNotation("h1"), BLACK)).toEqual([]);
  });

  it("複数の石を一直線に裏返す", () => {
    const board = parseBoard(`
      BWWWWWW.
      ........
      ........
      ........
      ........
      ........
      ........
      ........
    `);
    expect(findFlips(board, fromNotation("h1"), BLACK)).toHaveLength(6);
  });

  it("置けない場所や埋まったマスは IllegalMoveError", () => {
    const state = createInitialState();
    expect(() => reversi.applyMove(state, place("a1"))).toThrow(IllegalMoveError);
    expect(() => reversi.applyMove(state, place("d4"))).toThrow(IllegalMoveError);
    expect(() => reversi.applyMove(state, { type: "place", index: 64 })).toThrow(IllegalMoveError);
  });

  it("置ける場所があるときはパスできない", () => {
    expect(() => reversi.applyMove(createInitialState(), { type: "pass" })).toThrow(
      IllegalMoveError,
    );
  });
});

describe("パスと終局", () => {
  it("合法手が無いときはパスだけが合法手になる", () => {
    // 白番だが白はどこにも置けない。黒は h1 に置ける
    const state: ReversiState = {
      board: parseBoard(`
        BBBBBBB.
        BBBBBBWW
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
      `),
      turn: WHITE,
      moveNumber: 0,
    };
    expect(notations(state)).toEqual(["pass"]);
    const { state: next, events } = reversi.applyMove(state, { type: "pass" });
    expect(events).toEqual([{ type: "passed", disc: WHITE }]);
    expect(next.turn).toBe(BLACK);
    expect(notations(next)).toEqual(["h1"]);
  });

  it("両者とも置けなければ終局し、合法手は空", () => {
    const state: ReversiState = {
      board: parseBoard(`
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        ........
        ........
        ........
        ........
      `),
      turn: WHITE,
      moveNumber: 0,
    };
    expect(isTerminal(state)).toBe(true);
    expect(reversi.legalMoves(state)).toEqual([]);
    expect(reversi.currentPlayer(state)).toBeNull();
    expect(reversi.result(state)).toEqual({ kind: "win", winner: 0, scores: [32, 0] });
  });

  it("石数が同じなら引き分け", () => {
    const state: ReversiState = {
      board: parseBoard(`
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
        WWWWWWWW
        WWWWWWWW
        WWWWWWWW
        WWWWWWWW
      `),
      turn: BLACK,
      moveNumber: 60,
    };
    expect(reversi.result(state)).toEqual({ kind: "draw", scores: [32, 32] });
  });

  it("白が多ければ白（プレイヤー 1）の勝ち", () => {
    const state: ReversiState = {
      board: parseBoard(`
        WWWWWWWW
        WWWWWWWW
        WWWWWWWW
        WWWWWWWW
        WWWWWWWW
        BBBBBBBB
        BBBBBBBB
        BBBBBBBB
      `),
      turn: BLACK,
      moveNumber: 60,
    };
    expect(reversi.result(state)).toEqual({ kind: "win", winner: 1, scores: [24, 40] });
  });
});

describe("座標表記", () => {
  it("a1 は左上、h8 は右下", () => {
    expect(fromNotation("a1")).toBe(0);
    expect(fromNotation("h8")).toBe(63);
    expect(toNotation(fromNotation("e6"))).toBe("e6");
    expect(() => fromNotation("i9")).toThrow();
  });
});
