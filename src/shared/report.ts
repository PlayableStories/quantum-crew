// The incident report's numbers for an event crew, from the room state (pure; the TV, the phones and tests use it).
// The crew version of solo's three numbers: Act I with the radio (the crew's own score), Act II's best plan (exactly
// 75%), Act III's crystals (the crew's dials average: the one that saved the station, else the latest). Plus the
// best pair (the highest exact rate among the latest locked dials, if it reaches 80%) and each pair's own numbers.
import {
  SURVIVAL_THRESHOLD,
  classicalExpectedWinRate,
  quantumExpectedWinRate,
  type TuningConfig,
} from "./chsh.ts";
import type { PairInfo, RateSummary, RoomState } from "./protocol.ts";

const rate = (r: RateSummary) => (r.rounds ? r.wins / r.rounds : null);

export type BestPair = { pairId: number; a: string; b: string; dials: { a: TuningConfig; b: TuningConfig }; rate: number };

export type CrewReport = {
  saved: boolean;
  /** The crew's Act I score (null if they skipped the night shift). */
  act1: number | null;
  /** The crew's dials average: the one that saved the station, else the latest Act III wave's (null before any). */
  act3: number | null;
  /** The pair whose locked dials score best, if that reaches 80% (null otherwise: the report uses the best dials). */
  bestPair: BestPair | null;
};

export function crewReport(s: Pick<RoomState, "stability" | "stationSaved" | "savedDialsRate" | "crewDialsRate" | "pairs">): CrewReport {
  let best: BestPair | null = null;
  for (const pair of s.pairs) {
    if (!pair.lockedDials) continue;
    const r = quantumExpectedWinRate(pair.lockedDials.a, pair.lockedDials.b);
    if (r >= SURVIVAL_THRESHOLD && (!best || r > best.rate))
      best = { pairId: pair.id, a: pair.a.name, b: pair.b.name, dials: pair.lockedDials, rate: r };
  }
  return {
    saved: s.stationSaved,
    act1: rate(s.stability.act1),
    act3: s.stationSaved ? s.savedDialsRate : s.crewDialsRate,
    bestPair: best,
  };
}

export type PairReport = {
  /** The pair's Act I score (null if they didn't play the night shift). */
  act1: number | null;
  /** Their locked Act II plans' true rate (null if they never played an Act II wave). */
  plan: number | null;
  /** Their locked dials' exact rate (null if they never played an Act III wave). */
  dials: number | null;
};

export function pairReport(pair: Pick<PairInfo, "act1" | "locked" | "lockedDials">): PairReport {
  return {
    act1: rate(pair.act1),
    plan: pair.locked ? classicalExpectedWinRate(pair.locked.a, pair.locked.b) : null,
    dials: pair.lockedDials ? quantumExpectedWinRate(pair.lockedDials.a, pair.lockedDials.b) : null,
  };
}
