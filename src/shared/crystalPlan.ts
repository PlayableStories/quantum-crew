// Act III as a crystal plan (event mode): each player plans which setting the station measures their crystal at, for
// a COOL and for a HOT sensor reading. Two linked crystals give the same direction with a chance that depends only on
// the gap between their settings, cos²(gap) (chsh.ts `matchProbability`). A measurement at θ and at θ + 180° is the
// same, so a gap is folded into 0°–90°. Everything here is built on chsh.ts; the maths there is untouched.
import {
  DIAL_POSITIONS,
  OPTIMAL_TUNING,
  SURVIVAL_THRESHOLD,
  matchProbability,
  quantumCases,
  quantumExpectedWinRate,
  type Light,
  type Table,
  type TuningConfig,
} from "./chsh.ts";

/** The smallest difference between two settings, modulo 180°: always 0°–90° (0° vs 157.5° = 22.5°). */
export function settingGap(a: number, b: number): number {
  const d = (((a - b) % 180) + 180) % 180;
  return Math.min(d, 180 - d);
}

/** The crystals' rule: for each gap the room can make, the chance the two crystals give the same direction. */
export const RULE_GAPS = [0, 22.5, 45, 67.5, 90] as const;
export const CRYSTAL_RULE: readonly { gap: number; same: number }[] = RULE_GAPS.map((gap) => ({
  gap,
  same: matchProbability(0, gap),
}));

/** One of the four equally likely sensor cases for a pair's crystal plans: the settings, their gap, whether the case
 *  needs the same direction (three cases) or different (both HOT), and the exact chance it holds. */
export type PlanCase = {
  x: Light;
  y: Light;
  thetaA: number;
  thetaB: number;
  gap: number;
  need: "same" | "differ";
  pWin: number;
};

export function planCases(a: TuningConfig, b: TuningConfig): PlanCase[] {
  return quantumCases(a, b).map((c) => ({
    ...c,
    gap: settingGap(c.thetaA, c.thetaB),
    need: (c.x & c.y) === 1 ? "differ" : "same",
  }));
}

/** The case a pair's plans hold least often (clue 2). The first such case on a tie (cases run COOL·COOL, COOL·HOT,
 *  HOT·COOL, HOT·HOT). */
export function weakestCase(a: TuningConfig, b: TuningConfig): PlanCase {
  return planCases(a, b).reduce((worst, c) => (c.pWin < worst.pWin - 1e-12 ? c : worst));
}

/** CORA's crystal plan in a seat: the best one for her table (the room has always used these). */
export const coraPlan = (table: Table): TuningConfig => OPTIMAL_TUNING[table];

/** A pair's true rate with Table A's and Table B's plans. */
export const planRate = (a: TuningConfig, b: TuningConfig) => quantumExpectedWinRate(a, b);

/** The pair's rate as a player at `table` sees it in the lull: their own plan against the partner's. */
export function pairRateFor(table: Table, own: TuningConfig, partner: TuningConfig): number {
  return table === "A" ? planRate(own, partner) : planRate(partner, own);
}

/** The clue 4 answer: four settings spread evenly, 22.5° apart (85.4%). */
export const CLUE_SETTINGS: Record<Table, TuningConfig> = OPTIMAL_TUNING;

/** The eight settings a plan can pick from. */
export const SETTINGS = DIAL_POSITIONS;

/** How many clues the ladder has; the room's `clue` runs 0 (none yet) to this. */
export const CLUE_COUNT = 4;

/** A pair's latest locked plans (Table A's, Table B's), or null before its first Act III wave. */
export type LockedPlans = { a: TuningConfig; b: TuningConfig } | null;

/** Clue 2 for one pair: nothing yet (no wave), found it (its locked plans hold 80%+), or a hint on its weakest case. */
export type ClueHint =
  | { kind: "none" }
  | { kind: "found"; rate: number }
  | { kind: "hint"; rate: number; weakest: PlanCase };

export function clueHint(plans: LockedPlans): ClueHint {
  if (!plans) return { kind: "none" };
  const rate = planRate(plans.a, plans.b);
  if (rate >= SURVIVAL_THRESHOLD - 1e-12) return { kind: "found", rate };
  return { kind: "hint", rate, weakest: weakestCase(plans.a, plans.b) };
}

/** How many pairs are not yet at 80% with their latest locked plans (a pair with no wave yet counts). */
export const pairsNotYet = (pairs: readonly { lockedDials: LockedPlans }[]) =>
  pairs.filter((p) => clueHint(p.lockedDials).kind !== "found").length;

/** Clue 4's numbers, from the maths: the spacing of the four settings, the match gap and its chance, the differ gap
 *  and its chance, and the rate. */
export function clueAnswer() {
  const cases = planCases(CLUE_SETTINGS.A, CLUE_SETTINGS.B);
  const match = cases.find((c) => c.need === "same")!;
  const differ = cases.find((c) => c.need === "differ")!;
  return {
    spacing: settingGap(CLUE_SETTINGS.A.greenDeg, CLUE_SETTINGS.B.greenDeg),
    matchGap: match.gap,
    same: matchProbability(0, match.gap),
    differGap: differ.gap,
    differ: 1 - matchProbability(0, differ.gap),
    rate: planRate(CLUE_SETTINGS.A, CLUE_SETTINGS.B),
  };
}
