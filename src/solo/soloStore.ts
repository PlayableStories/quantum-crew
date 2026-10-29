// Solo mode as a state machine: the player is Table A, CORA (an AI) is Table B. No server, no I/O.
// Act I: a short run of rounds with the radio working: CORA calls her reading and which way she's turning (at random,
// round by round), so the rule wins every round. Then the storm knocks the radio out.
// Act II: the player locks in the whole joint plan (their own and CORA's) and plays it; each pair played goes on the
// plan board at its exact rate. No pair beats 75%, and engineering fills in the untried pairs.
// Act III: both share the Entanglement Tool. CORA's dials sit at the optimal Table B setting. Each round the player
// taps MEASURE, the crystal suggests a pump, and the player sets the pump themselves (CORA always follows her
// crystal). The debrief opens once a batch is played with dials whose exact rate is ≥ 80% (or after two batches).
// Solo never samples: every rate shown is either the real rounds played or exact (chsh.ts).
// What CORA says is chosen in crew.ts from this state; the store only records what she's reacting to.
// Actions take `now` (ms) so tests can drive the clock; the Batch screen calls them from timers.
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  ACT1_ROUND_MS,
  ACT1_ROUNDS,
  ACT2_BATCHES,
  ACT3_ROUND_MS,
  BATCH_SIZE,
  DEBRIEF_AFTER_BATCHES,
  DEFAULT_CREW_PLAN,
  DEFAULT_PLAN,
  DEFAULT_TUNING,
  HINT_AFTER_FAILED_BATCHES,
  ROUND_MS,
} from "../config.ts";
import {
  OPTIMAL_TUNING,
  SURVIVAL_THRESHOLD,
  classicalExpectedWinRate,
  classicalValve,
  dialFor,
  drawInputs,
  measureFirst,
  measureSecond,
  quantumExpectedWinRate,
  scoreRound,
  winRate,
  type ClassicalStrategy,
  type Light,
  type RoundResult,
  type TuningConfig,
  type Valve,
} from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE } from "../shared/fiction.ts";
import { mulberry32, randomSeed, type Rng } from "../shared/rng.ts";
import { act1Order, type SensorPair } from "./act1.ts";
import { ALL_CELLS, cellKey, expectedBoard, type Board, type CellKey } from "./plans.ts";

export type Phase =
  | "intro"
  | "act1Batch"
  | "storm"
  | "act2Plan"
  | "act2Batch"
  | "act2Readout"
  | "ceiling"
  | "toolReveal"
  | "act3Plan"
  | "act3Batch"
  | "act3Readout"
  | "debrief";

/** Solo's acts (event mode's protocol has its own Act type, 2 | 3). */
export type Act = 1 | 2 | 3;

export type LiveRound = {
  /** 1-based round number within the batch. */
  n: number;
  x: Light;
  y: Light;
  deadline: number;
  /** Act III: the player's crystal, once they tap MEASURE (a suggestion: they still set the pump). */
  crystal: Valve | null;
  /** CORA's pump. Act I: drawn at random and called over the radio. Act III: from her crystal, measured right after
   *  the player's. */
  crewPump: Valve | null;
  /** Set once the player answers or times out; the screen shows it, then calls `advance`. */
  result: RoundResult | null;
};

/** What CORA is reacting to in the huddle (crew.ts turns it into words). */
export type CrewCue = "opening" | "agreeCrew" | "agreePlayer" | "idea";

export type SoloData = {
  phase: Phase;
  debriefStep: number;
  plan: ClassicalStrategy;
  /** Act II: CORA's half of the joint plan, set by the player in the huddle. */
  crewPlan: ClassicalStrategy;
  /** Act II plan board: exact rates by (your plan, CORA's plan). Blank until the pair is played in a batch. */
  board: Board;
  /** How many pairs engineering ran at the report (null before it). */
  engineeringRan: number | null;
  crewCue: CrewCue;
  tuning: TuningConfig;
  round: LiveRound | null;
  /** Rounds of the current (or last) batch. */
  batch: RoundResult[];
  /** Act I: the sensor readings for each round, drawn when the night shift starts. */
  act1Order: SensorPair[];
  /** Act I: CORA's pump for each round, at random (seeded), drawn when the night shift starts. She calls it out. */
  act1Crew: Valve[];
  act1: RoundResult[];
  /** Act III: whether the player set the pump their crystal suggested, per round of the current (or last) batch. */
  batchFollowed: boolean[];
  act2: RoundResult[];
  act3: RoundResult[];
  act2Batches: number;
  act3Batches: number;
  /** Act III batches played with dials whose exact rate is below 80% (they unlock the hint). */
  act3FailedBatches: number;
  /** An Act III batch has been played with dials whose exact rate is ≥ 80% (it unlocks the debrief). */
  act3Passed: boolean;
  hintShown: boolean;
};

export type SoloActions = {
  /** Leaves the intro: the night shift (Act I) starts. */
  start(): void;
  /** Leaves the storm screen: the first Act II huddle. */
  endStorm(): void;
  setPlan(light: Light, valve: Valve): void;
  /** Act II: the player sets a whole plan for themselves or for CORA. */
  choosePlan(who: "player" | "crew", plan: ClassicalStrategy): void;
  setDial(light: Light, deg: number): void;
  beginBatch(): void;
  /** Starts the next round, or ends the batch after the last one. */
  advance(now: number): void;
  /** The player sets their pump direction (Act III: only after MEASURE). */
  answer(valve: Valve, now: number): void;
  /** Act III: the player taps MEASURE; both crystals are read and the player's suggests a pump. */
  measure(now: number): void;
  /** Act III: the player sets the pump their crystal suggested. */
  followCrystal(now: number): void;
  timeout(now: number): void;
  nextBatch(): void;
  reportCeiling(): void;
  revealTool(): void;
  openTool(): void;
  showHint(): void;
  startDebrief(): void;
  setDebriefStep(step: number): void;
  reset(): void;
};

export type SoloState = SoloData & SoloActions;

const initialData = (): SoloData => ({
  phase: "intro",
  debriefStep: 0,
  plan: DEFAULT_PLAN,
  crewPlan: DEFAULT_CREW_PLAN,
  board: {},
  engineeringRan: null,
  crewCue: "opening",
  tuning: DEFAULT_TUNING,
  round: null,
  batch: [],
  act1Order: [],
  act1Crew: [],
  act1: [],
  batchFollowed: [],
  act2: [],
  act3: [],
  act2Batches: 0,
  act3Batches: 0,
  act3FailedBatches: 0,
  act3Passed: false,
  hintShown: false,
});

/** Which act a phase belongs to (the intro and the storm count as Act I, the ceiling reveal as Act II). */
export const actOf = (phase: Phase): Act =>
  phase.startsWith("act1") || phase === "intro" || phase === "storm"
    ? 1
    : phase.startsWith("act2") || phase === "ceiling"
      ? 2
      : 3;

/** The decision time for a round in this act. */
export const roundMs = (act: Act) => (act === 1 ? ACT1_ROUND_MS : act === 2 ? ROUND_MS : ACT3_ROUND_MS);

/** Rounds in a batch: Act I's short night-shift run, else BATCH_SIZE. */
export const batchSize = (act: Act) => (act === 1 ? ACT1_ROUNDS : BATCH_SIZE);


/** The exact rate of the player's dials against CORA's, if both follow their crystals. */
export const dialsRate = (s: Pick<SoloData, "tuning">) => quantumExpectedWinRate(s.tuning, OPTIMAL_TUNING.B);

export function createSoloStore(seed: number = randomSeed()) {
  const rng: Rng = mulberry32(seed);

  return createStore<SoloState>()((set, get) => {
    const resolve = (result: RoundResult, followed = false) => {
      const s = get();
      if (!s.round || s.round.result) return;
      const act = actOf(s.phase);
      set({
        round: { ...s.round, result },
        batch: [...s.batch, result],
        ...(act === 1
          ? { act1: [...s.act1, result] }
          : act === 2
            ? { act2: [...s.act2, result] }
            : { act3: [...s.act3, result], batchFollowed: [...s.batchFollowed, followed] }),
      });
    };

    const finishBatch = () => {
      const s = get();
      if (s.phase === "act1Batch") {
        // The last routine round: the storm arrives.
        set({ phase: "storm", round: null });
      } else if (s.phase === "act2Batch") {
        // The pair just played is now "tried": it goes on the board at its exact rate (no sampling).
        const tried = { rate: classicalExpectedWinRate(s.plan, s.crewPlan), by: "player" as const };
        set({
          phase: "act2Readout",
          round: null,
          act2Batches: s.act2Batches + 1,
          board: { ...s.board, [cellKey(s.plan, s.crewPlan)]: tried },
        });
      } else {
        // The gate: the dials played, not the batch's score. Exact rate ≥ 80% passes.
        const passed = dialsRate(s) >= SURVIVAL_THRESHOLD;
        set({
          phase: "act3Readout",
          round: null,
          act3Batches: s.act3Batches + 1,
          act3FailedBatches: s.act3FailedBatches + (passed ? 0 : 1),
          act3Passed: s.act3Passed || passed,
        });
      }
    };

    return {
      ...initialData(),

      start: () => {
        if (get().phase !== "intro") return;
        const order = act1Order(rng);
        const crew = order.map((): Valve => (rng() < 0.5 ? CLOCKWISE : ANTICLOCKWISE));
        set({ phase: "act1Batch", act1Order: order, act1Crew: crew, act1: [], batch: [], round: null });
      },

      endStorm: () => {
        if (get().phase === "storm") set({ phase: "act2Plan" });
      },

      setPlan: (light, valve) =>
        set((s) => ({
          plan: light === 0 ? { ...s.plan, onGreen: valve } : { ...s.plan, onRed: valve },
          crewCue: "agreePlayer",
        })),

      choosePlan: (who, plan) =>
        set(who === "player" ? { plan, crewCue: "agreePlayer" } : { crewPlan: plan, crewCue: "agreeCrew" }),

      setDial: (light, deg) =>
        set((s) => ({ tuning: light === 0 ? { ...s.tuning, greenDeg: deg } : { ...s.tuning, redDeg: deg } })),

      beginBatch: () => {
        const { phase } = get();
        if (phase === "act2Plan") set({ phase: "act2Batch", batch: [], round: null });
        else if (phase === "act3Plan") set({ phase: "act3Batch", batch: [], batchFollowed: [], round: null });
      },

      advance: (now) => {
        const s = get();
        if (s.phase !== "act1Batch" && s.phase !== "act2Batch" && s.phase !== "act3Batch") return;
        if (s.round && !s.round.result) return; // still waiting for the player
        const act = actOf(s.phase);
        if (s.batch.length >= batchSize(act)) return finishBatch();
        // Act I follows its prepared order (every combination, a purge but not first); later acts draw at random.
        const [x, y] = act === 1 ? s.act1Order[s.batch.length]! : (({ x, y }) => [x, y] as const)(drawInputs(rng));
        const deadline = now + roundMs(act);
        // Act I: CORA's pump is set (and called over the radio) as the round starts.
        const crewPump = act === 1 ? s.act1Crew[s.batch.length]! : null;
        set({ round: { n: s.batch.length + 1, x, y, deadline, crystal: null, crewPump, result: null } });
      },

      answer: (valve, now) => {
        const { phase, round } = get();
        if (!round || round.result || now > round.deadline) return;
        if (phase === "act1Batch") {
          resolve(scoreRound(round.x, round.y, valve, round.crewPump));
        } else if (phase === "act2Batch") {
          resolve(scoreRound(round.x, round.y, valve, classicalValve(get().crewPlan, round.y)));
        } else if (phase === "act3Batch" && round.crystal !== null) {
          // Scoring uses the pump the player set; CORA's comes from her crystal.
          resolve(scoreRound(round.x, round.y, valve, round.crewPump), valve === round.crystal);
        }
      },

      measure: (now) => {
        const { phase, round, tuning } = get();
        if (phase !== "act3Batch" || !round || round.result || round.crystal !== null || now > round.deadline) return;
        // DECISION: in solo the player always measures first; CORA's result is conditioned on it.
        const crystal = measureFirst(rng);
        const crewPump = measureSecond(crystal, dialFor(tuning, round.x), dialFor(OPTIMAL_TUNING.B, round.y), rng);
        set({ round: { ...round, crystal, crewPump } });
      },

      followCrystal: (now) => {
        const { round } = get();
        if (round?.crystal != null) get().answer(round.crystal, now);
      },

      timeout: (now) => {
        const { phase, round } = get();
        if (!round || round.result || now < round.deadline) return;
        // CORA still acts (from her plan, or her crystal); the player's missing pump setting makes it a loss.
        const b =
          phase === "act1Batch"
            ? round.crewPump
            : phase === "act2Batch"
              ? classicalValve(get().crewPlan, round.y)
              : (round.crewPump ?? measureFirst(rng));
        resolve(scoreRound(round.x, round.y, null, b));
      },

      nextBatch: () => {
        const { phase } = get();
        // Back in the huddle with the plan that just played: CORA offers an idea.
        if (phase === "act2Readout") set({ phase: "act2Plan", crewCue: "idea" });
        else if (phase === "act3Readout") set({ phase: "act3Plan" });
      },

      reportCeiling: () => {
        const s = get();
        if (s.phase !== "act2Readout") return;
        // Engineering works out every pair the crew didn't try, exactly.
        const exact = expectedBoard();
        const untried = ALL_CELLS.filter((k) => !s.board[k]);
        const board: Board = { ...s.board };
        for (const k of untried) board[k] = { rate: exact[k], by: "engineering" };
        set({ phase: "ceiling", board, engineeringRan: untried.length });
      },
      revealTool: () => {
        if (get().phase === "ceiling") set({ phase: "toolReveal" });
      },
      openTool: () => {
        if (get().phase === "toolReveal") set({ phase: "act3Plan" });
      },
      showHint: () => {
        if (hintAvailable(get())) set({ hintShown: true });
      },
      startDebrief: () => {
        if (debriefAvailable(get())) set({ phase: "debrief", debriefStep: 0 });
      },
      setDebriefStep: (step) => set({ debriefStep: step }),

      reset: () => set(initialData()),
    };
  });
}

// --- Derived ------------------------------------------------------------------------------------

export const canReportCeiling = (s: SoloData) => s.act2Batches >= ACT2_BATCHES;

/** Pairs the player tried: locked in and played in a batch (engineering's don't count). */
export const playerTried = (s: Pick<SoloData, "board">): CellKey[] =>
  ALL_CELLS.filter((k) => s.board[k]?.by === "player");

/** When a batch's score and the true rate disagree about passing 80%: "above" (lucky) or "below" (unlucky). */
export function luckGap(batchRate: number, trueRate: number): "above" | "below" | null {
  const batchPassed = batchRate >= SURVIVAL_THRESHOLD;
  const truePasses = trueRate >= SURVIVAL_THRESHOLD;
  if (batchPassed === truePasses) return null;
  return batchPassed ? "above" : "below";
}

export const hintAvailable = (s: SoloData) => s.act3FailedBatches >= HINT_AFTER_FAILED_BATCHES;

/** The debrief opens after an Act III batch played with dials at an exact ≥ 80%, or after enough batches. */
export const debriefAvailable = (s: SoloData) => s.act3Passed || s.act3Batches >= DEBRIEF_AFTER_BATCHES;

/** What the stability meter shows: the current act's rounds so far. */
export function displayedStability(s: SoloData): number | null {
  const act = actOf(s.phase);
  const rounds = act === 1 ? s.act1 : act === 2 ? s.act2 : s.act3;
  return rounds.length ? winRate(rounds) : null;
}

/** Act III: how many rounds of the current batch the player followed their crystal in. */
export const followedCount = (s: Pick<SoloData, "batchFollowed">) => s.batchFollowed.filter(Boolean).length;

// --- React binding ------------------------------------------------------------------------------

export const soloStore = createSoloStore();

export function useSolo<T>(selector: (s: SoloState) => T): T {
  return useStore(soloStore, selector);
}
