import { describe, expect, it } from "vitest";
import { OPTIMAL_TUNING, QUANTUM_LIMIT } from "./chsh.ts";
import type { PairInfo } from "./protocol.ts";
import { crewReport, pairReport } from "./report.ts";

const none = { rounds: 0, wins: 0, timeouts: 0 };
const zero = { greenDeg: 0, redDeg: 0 };
const always = { onGreen: 0, onRed: 0 } as const;
const revHot = { onGreen: 0, onRed: 1 } as const;
const best = { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B };

function pair(id: number, lockedDials: PairInfo["lockedDials"], extra: Partial<PairInfo> = {}): PairInfo {
  return {
    id,
    a: { playerId: `a${id}`, name: `A${id}` },
    b: { playerId: `b${id}`, name: `B${id}` },
    act1: none,
    act2: none,
    act3: none,
    answered: { a: false, b: false },
    plans: { a: always, b: always },
    locked: null,
    lastWave: null,
    dials: { a: zero, b: zero },
    lockedDials,
    ready: { a: false, b: false },
    followed: null,
    ...extra,
  };
}

const stability = { rolling: null, act1: { rounds: 24, wins: 24, timeouts: 0 }, act2: none, act3: none };

describe("crewReport", () => {
  it("saved: Act I's score, the average that saved the station, and the best pair", () => {
    const r = crewReport({
      stability,
      stationSaved: true,
      savedDialsRate: 0.82,
      crewDialsRate: 0.7, // a later wave dropped; the report keeps the one that saved
      pairs: [pair(1, { a: zero, b: zero }), pair(2, best)],
    });
    expect(r).toMatchObject({ saved: true, act1: 1, act3: 0.82 });
    expect(r.bestPair).toMatchObject({ pairId: 2, a: "A2", b: "B2" });
    expect(r.bestPair!.rate).toBeCloseTo(QUANTUM_LIMIT, 12);
  });

  it("not saved: the latest average, and no best pair when none reaches 80%", () => {
    const r = crewReport({
      stability: { ...stability, act1: none },
      stationSaved: false,
      savedDialsRate: null,
      crewDialsRate: 0.75,
      pairs: [pair(1, { a: zero, b: zero }), pair(2, null)],
    });
    expect(r).toEqual({ saved: false, act1: null, act3: 0.75, bestPair: null });
  });
});

describe("pairReport", () => {
  it("the pair's Act I score, its locked plan's true rate and its dials' exact rate; null for acts it didn't play", () => {
    const played = pairReport(
      pair(1, best, { act1: { rounds: 6, wins: 5, timeouts: 0 }, locked: { a: revHot, b: always } }),
    );
    expect(played.act1).toBeCloseTo(5 / 6, 12);
    expect(played.plan).toBe(0.75);
    expect(played.dials).toBeCloseTo(QUANTUM_LIMIT, 12);
    expect(pairReport(pair(2, null))).toEqual({ act1: null, plan: null, dials: null });
  });
});
