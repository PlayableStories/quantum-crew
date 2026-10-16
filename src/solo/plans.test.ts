import { describe, expect, it } from "vitest";
import { CLASSICAL_LIMIT, CLASSICAL_STRATEGIES } from "../shared/chsh.ts";
import { ALL_CELLS, cellKey, expectedBoard, planId, planOf, PLAN_IDS } from "./plans.ts";

describe("plan board", () => {
  it("has 16 cells and no cell beats 75%", () => {
    const board = expectedBoard();
    expect(ALL_CELLS).toHaveLength(16);
    for (const k of ALL_CELLS) expect(board[k]).toBeLessThanOrEqual(CLASSICAL_LIMIT);
  });

  it("has 8 cells at 75% and 8 at 25%", () => {
    const rates = Object.values(expectedBoard());
    expect(rates.filter((r) => r === 0.75)).toHaveLength(8);
    expect(rates.filter((r) => r === 0.25)).toHaveLength(8);
  });

  it("names round-trip with chsh.ts's strategies", () => {
    for (const id of PLAN_IDS) expect(planId(planOf(id))).toBe(id);
    expect(cellKey(CLASSICAL_STRATEGIES[1]!, CLASSICAL_STRATEGIES[3]!)).toBe("1-3");
  });
});
