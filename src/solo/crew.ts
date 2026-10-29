// What the solo crewmate says, chosen deterministically from the store. Pure; the only place crewmate lines are
// picked. Comms rule: the crewmate speaks only while comms are open (Act I's night shift, the storm's last broken
// line, the huddle, readout, engineering report, tool reveal, tuning). During an Act II or III batch comms are dark and
// this returns nothing; the station's telemetry reports rounds.
import { SURVIVAL_THRESHOLD, winRate, type RoundResult } from "../shared/chsh.ts";
import { COOL, HOT, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { PLAN_IDS, cellKey, planId, planOf, type PlanId } from "./plans.ts";
import { act1CrewPump, type Phase, type SoloData } from "./soloStore.ts";

/** Phases where the crewmate can't talk: a batch is under way. */
export const COMMS_DARK_PHASES: readonly Phase[] = ["act2Batch", "act3Batch"];

export const commsDark = (phase: Phase) => COMMS_DARK_PHASES.includes(phase);

type CrewView = Pick<SoloData, "phase" | "crewCue" | "plan" | "crewPlan" | "board" | "batch"> & {
  round?: SoloData["round"];
};

export function crewLines(s: CrewView): string[] {
  if (commsDark(s.phase)) return [];
  const C = S.crew;
  switch (s.phase) {
    case "act1Batch":
      // Act I, radio working: standard procedure before the first round, then her reading each live round.
      if (!s.round) return s.batch.length === 0 ? [C.act1Opening] : [];
      return s.round.result ? [] : [C.reading(s.round.y, act1CrewPump(s.round.y))];
    case "storm":
      return [C.stormBreak];
    case "act2Plan":
      return [huddleLine(s)];
    case "act2Readout":
      return act2Reactions(s.batch);
    case "act3Readout":
      return [winRate(s.batch) >= SURVIVAL_THRESHOLD ? C.readout.act3Good : C.readout.act3Bad];
    case "ceiling":
      return [C.ceiling];
    case "toolReveal":
      return [C.tool];
    case "act3Plan":
      return [C.tuning];
    default:
      return []; // intro and debrief: no radio
  }
}

function huddleLine(s: CrewView): string {
  const C = S.crew;
  switch (s.crewCue) {
    case "opening":
      return C.opening;
    case "agreeCrew":
      return C.agreeCrew[planId(s.crewPlan)]!;
    case "agreePlayer":
      return C.agreePlayer[planId(s.plan)]!;
    case "idea": {
      const idea = nextIdea(s);
      return idea === null ? C.allTried : C.idea[idea]!;
    }
  }
}

// Ideas suggest a crewmate plan the crew hasn't tried yet, starting from the closest change to standard.
const IDEA_ORDER: readonly PlanId[] = [1, 2, 3, 0];

/** The crewmate plan to suggest next, or null once every cell on the board has been tried. */
export function nextIdea(s: Pick<SoloData, "plan" | "crewPlan" | "board">): PlanId | null {
  const current = planId(s.crewPlan);
  const untestedWith = (player: PlanId) =>
    IDEA_ORDER.find((c) => c !== current && !s.board[cellKey(planOf(player), planOf(c))]);
  const forMe = untestedWith(planId(s.plan));
  if (forMe !== undefined) return forMe;
  for (const p of PLAN_IDS) {
    const c = untestedWith(p);
    if (c !== undefined) return c;
  }
  return null;
}

type Reaction = { line: (n: number) => string; match: (r: RoundResult) => boolean };

// Losses first, most telling first. The player is Section A (x, a), the crewmate Section B (y, b).
const LOSS_REACTIONS: readonly Reaction[] = [
  { line: S.crew.readout.overheat, match: (r) => roundCause(r) === "overheat" },
  { line: S.crew.readout.hotCool, match: (r) => roundCause(r) === "spike" && r.x === HOT && r.y === COOL },
  { line: S.crew.readout.coolHot, match: (r) => roundCause(r) === "spike" && r.x === COOL && r.y === HOT },
  { line: S.crew.readout.bothCool, match: (r) => roundCause(r) === "spike" && r.x === COOL && r.y === COOL },
  { line: S.crew.readout.timeout, match: (r) => roundCause(r) === "slow" },
];

/** 1–2 reactions to an Act II batch: its most telling loss, then a perfect batch or a purge. */
export function act2Reactions(batch: readonly RoundResult[]): string[] {
  const C = S.crew.readout;
  const lines: string[] = [];
  for (const { line, match } of LOSS_REACTIONS) {
    const i = batch.findIndex(match);
    if (i >= 0) {
      lines.push(line(i + 1));
      break;
    }
  }
  if (batch.length > 0 && batch.every((r) => r.win)) lines.push(C.perfect);
  else {
    const purge = batch.findIndex((r) => roundCause(r) === "purge");
    if (purge >= 0) lines.push(C.purge(purge + 1));
  }
  return lines.length ? lines : [C.steady];
}
