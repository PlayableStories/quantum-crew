import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../config.ts";
import { QUANTUM_LIMIT } from "./chsh.ts";
import {
  CLUE_SETTINGS,
  CRYSTAL_RULE,
  answerPlanFor,
  clueAnswer,
  clueHint,
  coraPlan,
  moverFor,
  pairRateFor,
  pairsNotYet,
  planCases,
  planRate,
  settingGap,
  weakestCase,
} from "./crystalPlan.ts";

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

describe("clue 2 and clue 4 (E3d)", () => {
  it("clueHint: nothing before a wave, found it at 80%+, else the weakest case", () => {
    expect(clueHint(null)).toEqual({ kind: "none" });
    expect(clueHint({ a: CLUE_SETTINGS.A, b: CLUE_SETTINGS.B }).kind).toBe("found");
    const h = clueHint({ a: DEFAULT_TUNING, b: DEFAULT_TUNING });
    expect(h.kind === "hint" && [h.weakest.x, h.weakest.y, h.weakest.need]).toEqual([1, 1, "differ"]);
    // A match case as the weakest: A COOL 0°, HOT 90°; B COOL 45°, HOT 135° (A COOL · B COOL at 45°, 50%).
    const m = clueHint({ a: { greenDeg: 0, redDeg: 90 }, b: { greenDeg: 45, redDeg: 135 } });
    expect(m.kind === "hint" && m.weakest.need).toBe("same");
  });

  it("pairsNotYet counts pairs under 80% on their live plans", () => {
    const pairs = [{ dials: { a: CLUE_SETTINGS.A, b: CLUE_SETTINGS.B } }, { dials: { a: DEFAULT_TUNING, b: DEFAULT_TUNING } }];
    expect(pairsNotYet(pairs)).toBe(1);
  });

  it("the hint follows the current plans: both HOT at 0° first, then whichever case is weakest after a change", () => {
    const start = clueHint({ a: DEFAULT_TUNING, b: DEFAULT_TUNING });
    expect(start.kind === "hint" && [start.weakest.x, start.weakest.y, start.weakest.gap, start.weakest.pWin]).toEqual([1, 1, 0, 0]);
    // A moves HOT to 90°: both HOT is now perfect, and a match case (A HOT · B COOL, gap 90°) is the weakest.
    const moved = clueHint({ a: { greenDeg: 0, redDeg: 90 }, b: DEFAULT_TUNING });
    expect(moved.kind === "hint" && [moved.weakest.x, moved.weakest.y, moved.weakest.need]).toEqual([1, 0, "same"]);
  });

  it("the answer's row completes CORA's fixed plan to 85.4% at either table; moverFor names the player's setting", () => {
    expect(planRate(answerPlanFor("A"), coraPlan("B"))).toBeCloseTo(QUANTUM_LIMIT, 12);
    expect(planRate(coraPlan("A"), answerPlanFor("B"))).toBeCloseTo(QUANTUM_LIMIT, 12);
    expect(moverFor({ x: 1, y: 0 }, "A")).toBe(1);
    expect(moverFor({ x: 1, y: 0 }, "B")).toBe(0);
  });

  it("clue 4: settings 22.5° apart, three match gaps of 22.5° (85% the same), a differ gap of 67.5° (85% different), 85.4%", () => {
    const k = clueAnswer();
    expect([k.spacing, k.matchGap, k.differGap]).toEqual([22.5, 22.5, 67.5]);
    expect(Math.round(k.same * 100)).toBe(85);
    expect(Math.round(k.differ * 100)).toBe(85);
    expect(k.rate).toBeCloseTo(QUANTUM_LIMIT, 10);
  });
});
