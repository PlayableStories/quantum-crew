import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../config.ts";
import { QUANTUM_LIMIT } from "./chsh.ts";
import { CLUE_SETTINGS, CRYSTAL_RULE, coraPlan, pairRateFor, planCases, planRate, settingGap, weakestCase } from "./crystalPlan.ts";

describe("crystal plans", () => {
  it("a gap folds modulo 180° into 0°–90°", () => {
    expect(settingGap(0, 157.5)).toBe(22.5);
    expect(settingGap(157.5, 0)).toBe(22.5);
    expect(settingGap(45, 135)).toBe(90);
    expect(settingGap(22.5, 157.5)).toBe(45);
    expect(settingGap(67.5, 67.5)).toBe(0);
    expect(settingGap(0, 112.5)).toBe(67.5);
  });

  it("the crystals' rule: 100%, 85%, 50%, 15%, 0% the same, from matchProbability", () => {
    expect(CRYSTAL_RULE.map((r) => r.gap)).toEqual([0, 22.5, 45, 67.5, 90]);
    expect(CRYSTAL_RULE.map((r) => Math.round(r.same * 100))).toEqual([100, 85, 50, 15, 0]);
  });

  it("two humans at the starting plan (0°) hold exactly 75%", () => {
    expect(planRate(DEFAULT_TUNING, DEFAULT_TUNING)).toBe(0.75);
  });

  it("a human at 0° with CORA: computed per table (Table A with CORA at B is about 67.7%)", () => {
    expect(pairRateFor("A", DEFAULT_TUNING, coraPlan("B"))).toBeCloseTo(0.677, 3);
    expect(pairRateFor("B", DEFAULT_TUNING, coraPlan("A"))).toBe(planRate(coraPlan("A"), DEFAULT_TUNING));
  });

  it("the clue 4 settings: three match gaps of 22.5°, a differ gap of 67.5°, 85.4%", () => {
    const cases = planCases(CLUE_SETTINGS.A, CLUE_SETTINGS.B);
    expect(cases.filter((c) => c.need === "same").map((c) => c.gap)).toEqual([22.5, 22.5, 22.5]);
    expect(cases.find((c) => c.need === "differ")!.gap).toBe(67.5);
    expect(planRate(CLUE_SETTINGS.A, CLUE_SETTINGS.B)).toBeCloseTo(QUANTUM_LIMIT, 12);
  });

  it("the weakest case at the starting plan is both HOT (gap 0°, needs different)", () => {
    const w = weakestCase(DEFAULT_TUNING, DEFAULT_TUNING);
    expect([w.x, w.y, w.gap, w.need, w.pWin]).toEqual([1, 1, 0, "differ", 0]);
  });
});
