// One event room: players at two tables, paired A₁↔B₁, A₂↔B₂…, with an AI crewmate in any empty seat.
// The room is authoritative: it draws every light, runs the clocks, scores rounds and broadcasts state.
// Each phone only ever receives its own light. Clock, randomness, timers and sending are injected, so
// tests can drive a whole session without sockets or real time.
import {
  ACT1_ROUNDS,
  ACT1_SETTLE_MS,
  BOT_ACT2_PLAN,
  CORA_DELAY_MS,
  DEFAULT_PLAN,
  DEFAULT_TUNING,
  MAX_PAIRS,
  MP_WAVE_SIZE,
  START_CONFIRM_MS,
  STORM_STATIC_MS,
} from "../src/config.ts";
import { act1Order, type SensorPair } from "../src/shared/act1.ts";
import { roundCause } from "../src/shared/fiction.ts";
import { cellKey, type CellKey } from "../src/shared/plans.ts";
import { decisionMs, resultMs } from "../src/shared/pace.ts";
import { CLUE_COUNT } from "../src/shared/crystalPlan.ts";
import {
  DIAL_POSITIONS,
  OPTIMAL_TUNING,
  SURVIVAL_THRESHOLD,
  classicalValve,
  dialFor,
  drawInputs,
  measureFirst,
  measureSecond,
  quantumExpectedWinRate,
  scoreRound,
  type ClassicalStrategy,
  type Light,
  type Table,
  type TuningConfig,
  type Valve,
} from "../src/shared/chsh.ts";
import type {
  Act,
  ClientMsg,
  ErrorCode,
  HostCommand,
  Speed,
  PairInfo,
  RateSummary,
  RoomPhase,
  RoomState,
  RoundOutcome,
  ServerMsg,
} from "../src/shared/protocol.ts";
import { REPORT_STEPS, roundIdOf } from "../src/shared/protocol.ts"; // values, so not in the type-only import above
import { CREW_NAME } from "../src/strings.ts";
import type { Rng } from "../src/shared/rng.ts";

export type Conn = string;

export type RoomDeps = {
  now: () => number;
  rng: Rng;
  /** Runs `fn` after `ms`; returns a cancel function. */
  schedule: (fn: () => void, ms: number) => () => void;
  send: (conn: Conn, msg: ServerMsg) => void;
  newId: () => string;
};

type Player = {
  id: string;
  name: string;
  table: Table;
  conn: Conn | null;
  joinOrder: number;
  classical: ClassicalStrategy;
  tuning: TuningConfig;
  /** The lull (R1): this player has said they're ready. Cleared by a plan change and whenever a lull opens. */
  ready: boolean;
};

type Pair = { id: number; a: Player | null; b: Player | null };
type Side = "a" | "b";

/**
 * One pair's part of the live round. A null valve = not answered yet. In Act III the room measures both crystals at
 * round start, each at its player's planned setting for their sensor reading (`theta`).
 */
type PairRound = {
  x: Light;
  y: Light;
  a: Valve | null;
  b: Valve | null;
  theta: { a: number | null; b: number | null };
  /** Act III: what each side's crystal said (a suggestion; the pump is `a` / `b`). Each phone only ever gets its own. */
  crystal: { a: Valve | null; b: Valve | null };
  /** A seated player who was away for this round: CORA played their seat (their own rows don't count it). */
  covered: { a: boolean; b: boolean };
};

/** Act III no-signalling record for one seat: its OPEN count split by the partner's light. */
type SeatMarginal = { name: string; table: Table; green: { open: number; n: number }; red: { open: number; n: number } };

/** `deadline` is null in manual (no countdown: it closes when everyone has chosen, or on Next). */
type LiveRound = { id: string; deadline: number | null; byPair: Map<number, PairRound> };

/** The least an auto round or result keeps when the speed changes under it, so a switch never ends it on the spot. */
const MIN_LEFT_MS = 2000;

const emptyRate = (): RateSummary => ({ rounds: 0, wins: 0, timeouts: 0 });
const emptyActs = (): Record<Act, RateSummary> => ({ 1: emptyRate(), 2: emptyRate(), 3: emptyRate() });
const addResult = (r: RateSummary, o: RoundOutcome) => {
  r.rounds++;
  if (o.win) r.wins++;
  if (o.timedOut) r.timeouts++;
};

/** An empty seat is filled by CORA, the station's AI (the same name as solo's crewmate). */
export const BOT_NAME = CREW_NAME;

/** Snaps any angle to the nearest of the tool's 8 dial positions (mod 180°). */
export function snapDial(deg: number): number {
  const i = Math.round((((deg % 180) + 180) % 180) / 22.5) % DIAL_POSITIONS.length;
  return DIAL_POSITIONS[i]!;
}

export function createRoom(code: string, deps: RoomDeps) {
  const token = deps.newId();
  let hostConn: Conn | null = null;
  /** The facilitator's phone remotes: paired with `remoteKey` (from the TV's QR code); they get what the TV gets and
   *  may send host commands (not unpairRemotes). Unpairing makes a new key and drops them. */
  let remoteKey = deps.newId();
  const remotes = new Set<Conn>();
  let lastActivity = deps.now();
  let joinCounter = 0;

  const players: Player[] = [];
  let pairs: Pair[] = [];

  let phase: RoomPhase = "lobby";
  let act: Act = 1;
  let batchNo = 0;
  let roundNo = 0;
  let deadline: number | null = null;
  let live: LiveRound | null = null;
  /** Everything counting down, by key: "phase" (a round's deadline, a result, the storm's static), "settle" (Act I:
   *  the round closes once every pump has stayed put for ACT1_SETTLE_MS) and "cora-<pair>-<side>" (CORA's moves). */
  const timers = new Map<string, () => void>();
  /** Pacing (see RoomState.auto): auto or manual, the auto speed, whether the facilitator has chosen (then the
   *  default stops applying), when the running round / result timer started, and how many waves each act started. */
  let auto = false;
  let speed: Speed = "relaxed";
  let autoChosen = false;
  let timerSince = 0;
  let wavesInAct: Record<Act, number> = { 1: 0, 2: 0, 3: 0 };
  let lullSince: number | null = null;
  /** Act I: each pair's sensor order for the night shift (every combination, no double HOT first). */
  let act1Orders = new Map<number, SensorPair[]>();
  let ceilingRevealed = false;
  let toolUnlocked = false;
  /** Act III's clue ladder (0–CLUE_COUNT); only rises, until Reset. */
  let clue = 0;
  /** The lull (R1): Start the wave was pressed with pairs still planning; the next press (at the new step) starts it.
   *  Lapses after START_CONFIRM_MS, on any readiness change, or on a phase change. */
  let startConfirm = false;

  // Stats
  let rolling: boolean[] = [];
  let actStats: Record<Act, RateSummary> = emptyActs();
  let pairStats = new Map<number, Record<Act, RateSummary>>();
  let batchStats: RateSummary | null = null;
  let lastBatch: RateSummary | null = null;
  /** Act II: each pair's plans as locked at the latest wave start, and every pairing the crew has played. */
  let lockedPlans = new Map<number, { a: ClassicalStrategy; b: ClassicalStrategy }>();
  let triedPlans = new Set<CellKey>();
  /** Each pair's rounds in the current (or latest) wave. */
  let pairWave = new Map<number, RateSummary>();
  /** Act III: each pair's dials locked at the latest wave start, and its followed count in that wave. */
  let lockedDials = new Map<number, { a: TuningConfig; b: TuningConfig }>();
  let pairFollowed = new Map<number, { n: number; of: number }>();
  let crewDialsRate: number | null = null;
  let stationSaved = false;
  let savedDialsRate: number | null = null;
  let debriefStep = 0;
  /** Keyed by player id, or `bot-<pair>-<side>` for an AI crewmate. */
  let marginals = new Map<string, SeatMarginal>();

  // --- Sending ----------------------------------------------------------------------------------

  /** The TV and every paired remote. */
  const toHost = (msg: ServerMsg) => {
    if (hostConn) deps.send(hostConn, msg);
    for (const conn of remotes) deps.send(conn, msg);
  };
  const toPlayer = (p: Player | null, msg: ServerMsg) => p?.conn && deps.send(p.conn, msg);
  const error = (conn: Conn, code: ErrorCode, message: string) => deps.send(conn, { type: "error", code, message });

  function state(): RoomState {
    const seat = (p: Player | null) => ({ playerId: p?.id ?? null, name: p?.name ?? BOT_NAME });
    const pairInfo = (pair: Pair): PairInfo => {
      const pr = live?.byPair.get(pair.id);
      const stats = pairStats.get(pair.id) ?? emptyActs();
      return {
        id: pair.id,
        a: seat(pair.a),
        b: seat(pair.b),
        act1: stats[1],
        act2: stats[2],
        act3: stats[3],
        answered: { a: !!pr && pr.a !== null, b: !!pr && pr.b !== null },
        plans: pairPlans(pair),
        locked: lockedPlans.get(pair.id) ?? null,
        lastWave: pairWave.get(pair.id) ?? null,
        dials: pairDials(pair),
        lockedDials: lockedDials.get(pair.id) ?? null,
        ready: phase === "strategy" ? { a: seatReady(pair, "a"), b: seatReady(pair, "b") } : { a: false, b: false },
        followed: pairFollowed.get(pair.id) ?? null,
      };
    };
    return {
      room: code,
      phase,
      act,
      batchNo,
      roundNo,
      batchSize: MP_WAVE_SIZE,
      deadline,
      serverNow: deps.now(),
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        table: p.table,
        connected: p.conn !== null,
        pairId: pairs.find((pair) => pair.a === p || pair.b === p)?.id ?? null,
      })),
      pairs: pairs.map(pairInfo),
      stability: {
        rolling: rolling.length ? rolling.filter(Boolean).length / rolling.length : null,
        act1: actStats[1],
        act2: actStats[2],
        act3: actStats[3],
      },
      lastBatch,
      triedPlans: [...triedPlans],
      act3Followed: pairFollowed.size
        ? [...pairFollowed.values()].reduce((sum, f) => ({ n: sum.n + f.n, of: sum.of + f.of }), { n: 0, of: 0 })
        : null,
      crewDialsRate,
      stationSaved,
      savedDialsRate,
      debriefStep,
      auto,
      speed,
      autoChosen,
      lullSince,
      remotes: remotes.size,
      clue,
      startConfirm,
      step: stepSig(),
      ceilingRevealed,
      toolUnlocked,
      // Only in the debrief: per-light counts could otherwise hint at a partner's past lights mid-game.
      marginals: phase === "debrief" ? marginalRows() : null,
    };
  }

  function marginalRows(): NonNullable<RoomState["marginals"]> {
    const rate = (c: { open: number; n: number }) => (c.n ? c.open / c.n : null);
    const all = [...marginals.values()];
    const sum = (pick: (m: SeatMarginal) => { open: number; n: number }) =>
      all.reduce((acc, m) => ({ open: acc.open + pick(m).open, n: acc.n + pick(m).n }), { open: 0, n: 0 });
    const green = sum((m) => m.green);
    const red = sum((m) => m.red);
    return {
      rows: all.map((m) => ({
        name: m.name,
        table: m.table,
        partnerGreen: rate(m.green),
        partnerRed: rate(m.red),
        rounds: m.green.n + m.red.n,
      })),
      crew: { partnerGreen: rate(green), partnerRed: rate(red), rounds: green.n + red.n },
    };
  }

  function broadcast() {
    const msg: ServerMsg = { type: "room:state", state: state() };
    toHost(msg);
    for (const p of players) toPlayer(p, msg);
  }

  // --- Pairing ----------------------------------------------------------------------------------

  /** Pairs the i-th player at Table A with the i-th at Table B; a bot fills any empty seat. */
  function repair() {
    const byTable = (t: Table) => players.filter((p) => p.table === t).sort((p, q) => p.joinOrder - q.joinOrder);
    const as = byTable("A");
    const bs = byTable("B");
    const n = Math.max(as.length, bs.length);
    pairs = Array.from({ length: n }, (_, i) => ({ id: i + 1, a: as[i] ?? null, b: bs[i] ?? null }));
    for (const pair of pairs) if (!pairStats.has(pair.id)) pairStats.set(pair.id, emptyActs());
  }

  const inBatch = () => phase === "round" || phase === "roundResult";

  // --- Timers (pausable) -------------------------------------------------------------------------

  /** Runs `fn` after `ms` under `key` (replacing any timer with that key). */
  function later(key: string, ms: number, fn: () => void) {
    cancel(key);
    const cancelIt = deps.schedule(() => {
      timers.delete(key);
      fn();
    }, ms);
    timers.set(key, cancelIt);
  }

  function cancel(key: string) {
    timers.get(key)?.();
    timers.delete(key);
  }

  /** Cancels every timer (a phase change), and with it any pending "Start anyway?". */
  function clearTimer() {
    for (const cancelIt of timers.values()) cancelIt();
    timers.clear();
    startConfirm = false;
  }

  /** Cancels a round's timers: its deadline, Act I's settle and CORA's pending moves. */
  function clearRoundTimers() {
    for (const key of [...timers.keys()]) if (key === "phase" || key === "settle" || key.startsWith("cora-")) cancel(key);
  }

  // --- Pacing ----------------------------------------------------------------------------------

  /** At each wave (and the night shift): unless the facilitator has chosen, the act's first wave is manual and later
   *  waves are auto. */
  function applyDefaultPace() {
    if (!autoChosen) auto = wavesInAct[act] > 1;
  }

  /** (Re)starts the running round's or result's timer from the mode and speed, effective at once. `fresh`: the full
   *  time from now (a new round or result, or switching to auto); otherwise (a speed change) the new total minus the
   *  time already spent, keeping at least MIN_LEFT_MS. In manual it stops the timer. */
  function startPhaseTimer(fresh: boolean) {
    if (phase !== "round" && phase !== "roundResult") return;
    if (!auto) return stopPhaseTimer();
    const now = deps.now();
    const total = phase === "round" ? decisionMs(speed, act) : resultMs(speed, act);
    if (fresh) timerSince = now;
    const ms = fresh ? total : Math.max(total - (now - timerSince), MIN_LEFT_MS);
    later("phase", ms, phase === "round" ? resolveRound : afterResult);
    deadline = now + ms;
    if (phase === "round" && live) live.deadline = deadline;
  }

  function stopPhaseTimer() {
    cancel("phase");
    deadline = null;
    if (phase === "round" && live) live.deadline = null;
  }

  /** The room's current step: changes with every phase, round, report step or clue (see RoomState.step). */
  const stepSig = () => `${phase}:${act}:${batchNo}:${roundNo}:${debriefStep}:${clue}${startConfirm ? ":confirm" : ""}`;

  // --- The lull's readiness (R1) ----------------------------------------------------------------

  /** A seat is ready when CORA plays it (empty, or its player is away) or its player has said so. */
  const seatReady = (pair: Pair, side: Side) => coraSeat(pair, side) || pair[side]!.ready;
  const allPairsReady = () => pairs.every((pair) => seatReady(pair, "a") && seatReady(pair, "b"));

  /** Any readiness change (or a join or drop in the lull) lapses a pending "Start anyway?": the count it asked about
   *  has changed, so the facilitator decides again. */
  function disarmStart() {
    if (!startConfirm) return;
    cancel("confirm");
    startConfirm = false;
  }

  /** A lull opens: nobody is ready yet. */
  function openLull() {
    for (const p of players) p.ready = false;
    startConfirm = false;
  }

  // --- Rounds -----------------------------------------------------------------------------------

  /** A pair's Act II plans: each player's choice, or CORA's standard procedure in an empty seat. */
  const pairPlans = (pair: Pair) => ({ a: pair.a?.classical ?? BOT_ACT2_PLAN, b: pair.b?.classical ?? BOT_ACT2_PLAN });

  /** CORA plays a seat that's empty, or whose player is away (until they rejoin). */
  const coraSeat = (pair: Pair, side: Side) => !pair[side] || pair[side]!.conn === null;

  /** CORA moves after a natural delay (from the room's RNG), in every pace. */
  function scheduleCora(pair: Pair, side: Side) {
    const [lo, hi] = CORA_DELAY_MS;
    later(`cora-${pair.id}-${side}`, lo + deps.rng() * (hi - lo), () => coraMove(pair.id, side));
  }

  /** CORA's move: Act I a random pump (her partner hears it), Act II standard procedure, Act III her crystal. */
  function coraMove(pairId: number, side: Side) {
    const pair = pairs.find((p) => p.id === pairId);
    const pr = live?.byPair.get(pairId);
    if (!live || phase !== "round" || !pair || !pr || pr[side] !== null) return;
    const light = side === "a" ? pr.x : pr.y;
    if (act === 1) {
      pr[side] = botValve(light);
      toPlayer(pair[side === "a" ? "b" : "a"], { type: "round:partner", roundId: live.id, pump: pr[side]! });
    } else if (act === 2) pr[side] = botValve(light);
    else pr[side] = pr.crystal[side];
    afterAnswer();
  }

  /** The AI crewmate's Act II valve for a light. Act I: a random direction, called over the radio (as in solo). */
  const botValve = (light: Light): Valve =>
    act === 1 ? (deps.rng() < 0.5 ? 0 : 1) : classicalValve(BOT_ACT2_PLAN, light);

  /** The dial a seat uses for a light: the player's own tuning, or the optimal one for an AI crewmate. */
  const seatDial = (pair: Pair, side: Side, light: Light) => dialFor(pairDials(pair)[side], light);

  /** A pair's dials: each player's, or the optimal ones for an AI crewmate. */
  const pairDials = (pair: Pair) => ({ a: pair.a?.tuning ?? OPTIMAL_TUNING.A, b: pair.b?.tuning ?? OPTIMAL_TUNING.B });

  /**
   * Act III, at round start: the station measures both crystals, each at its player's planned setting for their sensor
   * reading. Table A's is a fair coin; Table B's equals it with probability cos²(gap). The joint odds don't depend on
   * the order, and each side alone stays 50/50: no signalling.
   */
  function measurePair(pair: Pair, pr: PairRound) {
    const thetaA = seatDial(pair, "a", pr.x);
    const thetaB = seatDial(pair, "b", pr.y);
    const a = measureFirst(deps.rng);
    pr.theta = { a: thetaA, b: thetaB };
    pr.crystal = { a, b: measureSecond(a, thetaA, thetaB, deps.rng) };
  }

  function startBatch() {
    clearTimer();
    lullSince = null;
    if (players.length === 0) {
      phase = "lobby";
      deadline = null;
      return broadcast();
    }
    repair();
    // From the lobby or the storm, a wave starts Act II (Act I is only ever started from the briefing).
    if (act === 1) act = 2;
    wavesInAct[act]++;
    applyDefaultPace();
    batchNo++;
    roundNo = 0;
    batchStats = emptyRate();
    pairWave = new Map(pairs.map((pair) => [pair.id, emptyRate()]));
    // Act III: the dials each pair goes into the wave with, and a fresh followed count.
    if (act === 3) {
      lockedDials = new Map(pairs.map((pair) => [pair.id, pairDials(pair)]));
      pairFollowed = new Map(pairs.map((pair) => [pair.id, { n: 0, of: 0 }]));
    }
    // Act II: the plans each pair goes into the wave with (a change mid-wave doesn't move the lock).
    if (act === 2)
      for (const pair of pairs) {
        const plans = pairPlans(pair);
        lockedPlans.set(pair.id, plans);
        triedPlans.add(cellKey(plans.a, plans.b));
      }
    nextRound();
  }

  /** The night shift's rounds: radio working, each pair on its own sensor order. */
  function startAct1() {
    clearTimer();
    repair();
    act = 1;
    wavesInAct[1] = 1;
    applyDefaultPace();
    roundNo = 0;
    act1Orders = new Map(pairs.map((pair) => [pair.id, act1Order(deps.rng)]));
    nextRound();
  }

  /** After the last Act I round: the radio breaks up (static until `deadline`, then the TV shows the storm log). */
  function startStorm() {
    clearTimer();
    live = null;
    phase = "storm";
    deadline = deps.now() + STORM_STATIC_MS;
    // The static has a deadline (the TV shows the log after it); a timer re-broadcasts when it ends.
    later("phase", STORM_STATIC_MS, broadcast);
    broadcast();
  }

  function nextRound() {
    roundNo++;
    const id = roundIdOf(act, batchNo, roundNo);
    const now = deps.now();
    const byPair = new Map<number, PairRound>();
    for (const pair of pairs) {
      const planned = act === 1 ? act1Orders.get(pair.id)?.[roundNo - 1] : undefined;
      const { x, y } = planned ? { x: planned[0], y: planned[1] } : drawInputs(deps.rng);
      const pr: PairRound = {
        x,
        y,
        a: null,
        b: null,
        theta: { a: null, b: null },
        crystal: { a: null, b: null },
        covered: { a: !!pair.a && !pair.a.conn, b: !!pair.b && !pair.b.conn },
      };
      if (act === 3) measurePair(pair, pr);
      byPair.set(pair.id, pr);
    }
    live = { id, deadline: null, byPair };
    phase = "round";
    startPhaseTimer(true);
    for (const pair of pairs) sendRoundStart(pair);
    // CORA plays empty and covered seats after a natural delay (in Act III she follows her crystal).
    for (const pair of pairs) for (const side of ["a", "b"] as const) if (coraSeat(pair, side)) scheduleCora(pair, side);
    broadcast();
  }

  function sendRoundStart(pair: Pair, only?: Player) {
    if (!live) return;
    const pr = live.byPair.get(pair.id);
    if (!pr) return;
    const base = { type: "round:start" as const, roundId: live.id, act, deadline: live.deadline, serverNow: deps.now() };
    for (const side of ["a", "b"] as const) {
      const p = pair[side];
      // Act I: a pump can change until the round ends, so a rejoining phone gets the round even after setting it.
      if (!p || (only && only !== p) || (act !== 1 && pr[side] !== null)) continue;
      const light = side === "a" ? pr.x : pr.y;
      const other: Side = side === "a" ? "b" : "a";
      const radio = { partner: { light: other === "a" ? pr.x : pr.y, pump: pr[other] }, pump: pr[side] };
      toPlayer(p, {
        ...base,
        light,
        ...(act === 3 ? { dialDeg: pr.theta[side]!, crystal: pr.crystal[side]! } : {}),
        ...(act === 1 ? radio : {}),
      });
    }
  }

  /** Act I: a pump tap, which may change the pump until the round ends; the partner hears it over the radio. The
   *  round ends early once every pump is set and none has changed for ACT1_SETTLE_MS. */
  function answerAct1(pair: Pair, pr: PairRound, side: Side, valve: Valve) {
    if (!live || pr[side] === valve) return;
    pr[side] = valve;
    const partner = pair[side === "a" ? "b" : "a"];
    toPlayer(partner, { type: "round:partner", roundId: live.id, pump: valve });
    afterAnswer();
  }

  /** After any pump is set: once every seat has one, the round closes (Act I: after ACT1_SETTLE_MS with no change,
   *  so a player can still change their mind). In every pace. */
  function afterAnswer() {
    if (!live) return;
    cancel("settle");
    const allSet = [...live.byPair.values()].every((r) => r.a !== null && r.b !== null);
    if (allSet && act === 1) later("settle", ACT1_SETTLE_MS, resolveRound);
    else if (allSet) return resolveRound();
    broadcast();
  }

  /** Act I / II: a valve tap. Act III: a valve tap sets the pump (the crystal was measured at round start; the pump
   *  may go against it, and can change until every pump is set). */
  function answer(player: Player, roundId: string, valve: Valve) {
    if (phase !== "round" || !live || live.id !== roundId) return;
    if (live.deadline !== null && deps.now() > live.deadline) return;
    const pair = pairs.find((p) => p.a === player || p.b === player);
    const pr = pair && live.byPair.get(pair.id);
    if (!pair || !pr) return;
    const side: Side = pair.a === player ? "a" : "b";
    if (act === 1) return answerAct1(pair, pr, side, valve);
    if (act === 3) pr[side] = valve;
    else {
      if (pr[side] !== null) return;
      pr[side] = valve;
    }
    afterAnswer();
  }

  function recordMarginal(pair: Pair, side: Side, valve: Valve | null, partnerLight: Light) {
    if (act !== 3 || valve === null) return;
    const p = pair[side];
    const key = p?.id ?? `bot-${pair.id}-${side}`;
    const m = marginals.get(key) ?? {
      name: p?.name ?? `${BOT_NAME} (pair ${pair.id})`,
      table: side === "a" ? "A" : "B",
      green: { open: 0, n: 0 },
      red: { open: 0, n: 0 },
    };
    const bucket = partnerLight === 0 ? m.green : m.red;
    bucket.n++;
    if (valve === 0) bucket.open++;
    marginals.set(key, m);
  }

  function resolveRound() {
    if (!live) return;
    clearRoundTimers();
    const results: RoundOutcome[] = [];
    for (const pair of pairs) {
      const pr = live.byPair.get(pair.id);
      if (!pr) continue;
      const r = scoreRound(pr.x, pr.y, pr.a, pr.b);
      const outcome: RoundOutcome = {
        pairId: pair.id,
        win: r.win,
        timedOut: r.timedOut,
        x: pr.x,
        y: pr.y,
        a: pr.a,
        b: pr.b,
        cause: roundCause(pr),
      };
      results.push(outcome);
      addResult(actStats[act], outcome);
      addResult(pairStats.get(pair.id)![act], outcome);
      if (batchStats) addResult(batchStats, outcome);
      const wave = pairWave.get(pair.id);
      if (wave && act !== 1) addResult(wave, outcome);
      // DECISION: the station gauge starts with the first storm wave; Act I (every round winnable) has its own rate.
      if (act !== 1) rolling.push(r.win);
      // A covered seat's round was CORA's: it doesn't count in the away player's own rows.
      if (!pr.covered.a) recordMarginal(pair, "a", pr.a, pr.y);
      if (!pr.covered.b) recordMarginal(pair, "b", pr.b, pr.x);
      // Act III: did each player set the pump their crystal suggested? (CORA always does; timeouts don't count.)
      const followed = pairFollowed.get(pair.id);
      if (act === 3 && followed)
        for (const side of ["a", "b"] as const) {
          if (!pair[side] || pr.covered[side] || pr[side] === null) continue;
          followed.of++;
          if (pr[side] === pr.crystal[side]) followed.n++;
        }
      const msg: ServerMsg = { type: "round:result", roundId: live.id, ...outcome };
      toPlayer(pair.a, msg);
      toPlayer(pair.b, msg);
    }
    // DECISION (P6): the station gauge is the last MP_WAVE_SIZE rounds of every pair (pairs × wave size pair-rounds),
    // so its label holds at any pair count and it moves smoothly across waves (a "this wave" gauge would blank at
    // each wave start and swing on its first rounds).
    rolling = rolling.slice(-Math.max(1, pairs.length) * MP_WAVE_SIZE);
    toHost({ type: "round:results", roundId: live.id, results });
    phase = "roundResult";
    // Manual: the result stays until the facilitator presses Next. Auto: the speed's timer moves on.
    startPhaseTimer(true);
    broadcast();
  }

  /** After a result: the next round, the wave's end, or (after Act I) the storm. */
  function afterResult() {
    cancel("phase");
    if (act === 1) return roundNo < ACT1_ROUNDS ? nextRound() : startStorm();
    return roundNo < MP_WAVE_SIZE ? nextRound() : endBatch();
  }

  function endBatch() {
    live = null;
    // Act III: the crew's dials, as the pairs' average exact rate; 80% saves the station (and it stays saved).
    if (act === 3 && lockedDials.size) {
      const rates = [...lockedDials.values()].map((d) => quantumExpectedWinRate(d.a, d.b));
      crewDialsRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      if (crewDialsRate >= SURVIVAL_THRESHOLD && !stationSaved) {
        stationSaved = true;
        savedDialsRate = crewDialsRate;
      }
    }
    phase = "batchDone";
    deadline = null;
    lastBatch = batchStats;
    batchStats = null;
    broadcast();
  }

  // --- Host commands ----------------------------------------------------------------------------

  function command(conn: Conn, cmd: HostCommand, step?: string, newSpeed?: Speed) {
    const notNow = () => error(conn, "not-now", `Can't ${cmd} during ${phase}.`);
    // Sent from a step the room has already left (a double press, or two controllers): ignore it.
    if (step !== undefined && step !== stepSig()) return error(conn, "stale", `Already past that step (${cmd}).`);
    switch (cmd) {
      // Pacing changes take effect at once, on the running round or result too.
      case "setSpeed":
        // Picking a speed also means "run by itself".
        if (!newSpeed) return notNow();
        speed = newSpeed;
        autoChosen = true;
        if (auto) startPhaseTimer(false);
        else {
          auto = true;
          startPhaseTimer(true);
        }
        return broadcast();
      case "auto":
        autoChosen = true;
        if (!auto) {
          auto = true;
          startPhaseTimer(true);
        }
        return broadcast();
      case "manual":
        autoChosen = true;
        auto = false;
        stopPhaseTimer();
        return broadcast();
      case "next":
        // In a round: close it now (anyone who hasn't chosen counts as too slow). On a result: move on now.
        if (phase === "round") return resolveRound();
        if (phase === "roundResult") return afterResult();
        return notNow();
      case "startNightShift":
        if (phase !== "lobby" || players.length === 0) return notNow();
        repair();
        act = 1;
        phase = "briefing";
        deadline = null;
        return broadcast();
      case "startStrategy":
        // Not from the briefing: once the night shift has started, its rounds come first.
        if (inBatch() || phase === "debrief" || phase === "briefing") return notNow();
        // From the lobby, the briefing or the storm: the lull before Act II's first wave.
        if (act === 1) act = 2;
        clearTimer();
        phase = "strategy";
        // Clue 1 (each pair's live hint and the nudge) opens with the first Act III lull.
        if (act === 3 && clue === 0) clue = 1;
        // DECISION (pacing): the lull isn't timed; the facilitator starts the wave. The TV shows how long it's been.
        deadline = null;
        lullSince = deps.now();
        openLull();
        return broadcast();
      case "startBatch":
        if (inBatch() || phase === "debrief" || players.length === 0) return notNow();
        if (phase === "ceiling" && !toolUnlocked) return notNow();
        // The lull (R1): with every pair ready the wave starts at once. Otherwise the first press asks "Start anyway?"
        // (the step changes, so a double press or a second controller can't also confirm it) and the next press starts.
        if (phase === "strategy" && !allPairsReady() && !startConfirm) {
          startConfirm = true;
          later("confirm", START_CONFIRM_MS, () => {
            startConfirm = false;
            broadcast();
          });
          return broadcast();
        }
        // A wave started straight from the tool reveal (no lull): clue 1 comes with it, so the answer can follow.
        if (act === 3 && clue === 0) clue = 1;
        return phase === "briefing" ? startAct1() : startBatch();
      case "revealCeiling":
        if (inBatch() || act !== 2) return notNow();
        clearTimer();
        phase = "ceiling";
        deadline = null;
        ceilingRevealed = true;
        return broadcast();
      case "unlockTool":
        if (inBatch() || toolUnlocked) return notNow();
        clearTimer();
        act = 3;
        toolUnlocked = true;
        phase = "tool";
        deadline = null;
        return broadcast();
      // Testing (the TV's D key): jump straight to an act, outside a wave. Played stats are kept.
      case "debugAct2":
        if (inBatch() || phase === "debrief") return notNow();
        clearTimer();
        act = 2;
        phase = "strategy";
        deadline = null;
        lullSince = deps.now();
        openLull();
        ceilingRevealed = toolUnlocked = false;
        clue = 0;
        return broadcast();
      case "debugAct3":
        if (inBatch() || phase === "debrief") return notNow();
        clearTimer();
        // What Reveal ceiling then Unlock tool leave behind: the tool reveal, no clue yet (clue 1 opens with the lull).
        act = 3;
        ceilingRevealed = toolUnlocked = true;
        clue = 0;
        phase = "tool";
        deadline = null;
        return broadcast();
      case "nextClue":
        // Clue 2, the answer: after clue 1 and at least one Act III wave; never in a wave; never past 2.
        if (!toolUnlocked || inBatch() || clue !== 1 || clue >= CLUE_COUNT || actStats[3].rounds === 0) return notNow();
        clue = 2;
        return broadcast();
      case "stormPasses":
        // The ending: after at least one Act III wave, outside a wave. It reads stationSaved (no new state).
        if (inBatch() || act !== 3 || actStats[3].rounds === 0 || phase === "resolution" || phase === "debrief")
          return notNow();
        clearTimer();
        phase = "resolution";
        deadline = null;
        return broadcast();
      case "debrief":
        if (inBatch()) return notNow();
        clearTimer();
        phase = "debrief";
        deadline = null;
        debriefStep = 0;
        return broadcast();
      case "reportBack":
      case "reportNext": {
        if (phase !== "debrief") return notNow();
        const step = debriefStep + (cmd === "reportNext" ? 1 : -1);
        if (step < 0 || step >= REPORT_STEPS) return notNow();
        debriefStep = step;
        return broadcast();
      }
      case "reset":
        clearTimer();
        phase = "lobby";
        act = 1;
        batchNo = roundNo = 0;
        deadline = null;
        live = null;
        auto = false;
        speed = "relaxed";
        autoChosen = false;
        wavesInAct = { 1: 0, 2: 0, 3: 0 };
        lullSince = null;
        ceilingRevealed = toolUnlocked = false;
        clue = 0;
        rolling = [];
        actStats = emptyActs();
        pairStats = new Map();
        act1Orders = new Map();
        lockedPlans = new Map();
        triedPlans = new Set();
        pairWave = new Map();
        lockedDials = new Map();
        pairFollowed = new Map();
        crewDialsRate = null;
        stationSaved = false;
        savedDialsRate = null;
        debriefStep = 0;
        marginals = new Map();
        batchStats = lastBatch = null;
        for (const p of players) {
          p.classical = DEFAULT_PLAN;
          p.tuning = DEFAULT_TUNING;
          p.ready = false;
        }
        repair();
        return broadcast();
    }
  }

  // --- Connections ------------------------------------------------------------------------------

  function join(conn: Conn, name: string, table: Table) {
    // Reconnect: the same name at the same table takes its seat back.
    const existing = players.find((p) => p.table === table && p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.conn = conn;
      deps.send(conn, { type: "player:joined", room: code, playerId: existing.id, name: existing.name, table });
      const pair = pairs.find((p) => p.a === existing || p.b === existing);
      const pr = pair && live?.byPair.get(pair.id);
      if (pair && pr && phase === "round") {
        // Back before CORA moved for them: the seat is theirs again this round.
        const side: Side = pair.a === existing ? "a" : "b";
        if (pr[side] === null) {
          cancel(`cora-${pair.id}-${side}`);
          pr.covered[side] = false;
        }
        sendRoundStart(pair, existing);
      }
      disarmStart(); // back from away: their seat counts as their own flag again
      broadcast();
      return;
    }
    if (players.filter((p) => p.table === table).length >= MAX_PAIRS) {
      return error(conn, "table-full", `Table ${table} is full.`);
    }
    const player: Player = {
      id: deps.newId(),
      name,
      table,
      conn,
      joinOrder: joinCounter++,
      classical: DEFAULT_PLAN,
      tuning: DEFAULT_TUNING,
      ready: false,
    };
    players.push(player);
    disarmStart(); // a new seat in the lull changes the count
    // DECISION: players who join mid-batch are seated when the batch ends.
    if (!inBatch()) repair();
    deps.send(conn, { type: "player:joined", room: code, playerId: player.id, name, table });
    broadcast();
  }

  /** A connection closed (or the player left): their seat stays theirs and CORA covers it until they rejoin. */
  function disconnect(conn: Conn) {
    if (conn === hostConn) hostConn = null;
    if (remotes.delete(conn)) broadcast();
    const player = players.find((p) => p.conn === conn);
    if (player) {
      player.conn = null;
      // Mid-round, CORA covers the seat at once (until the player rejoins with the same name and table).
      const pair = pairs.find((p) => p.a === player || p.b === player);
      const pr = pair && live?.byPair.get(pair.id);
      if (pair && pr && phase === "round") {
        const side: Side = pair.a === player ? "a" : "b";
        if (pr[side] === null) {
          pr.covered[side] = true;
          scheduleCora(pair, side);
        }
      }
      disarmStart(); // away: CORA covers the seat, which counts as ready
      broadcast();
    }
  }

  return {
    code,
    token,

    /** Messages for this room; `host:create` is handled by the station. */
    handle(conn: Conn, msg: ClientMsg) {
      lastActivity = deps.now();
      const player = players.find((p) => p.conn === conn);
      switch (msg.type) {
        case "host:create":
          hostConn = conn;
          deps.send(conn, { type: "host:created", room: code, token, remoteKey });
          return broadcast();
        case "host:resume":
          if (msg.token !== token) return error(conn, "not-host", "That host link has expired.");
          hostConn = conn;
          deps.send(conn, { type: "host:created", room: code, token, remoteKey });
          return broadcast();
        case "remote:pair":
          if (msg.key !== remoteKey) return error(conn, "not-host", "That remote link has expired.");
          remotes.add(conn);
          deps.send(conn, { type: "remote:paired", room: code });
          return broadcast();
        case "host:command":
          if (msg.cmd === "unpairRemotes") {
            if (conn !== hostConn) return error(conn, "not-host", "Only the TV can unpair remotes.");
            remoteKey = deps.newId();
            for (const r of remotes) error(r, "not-host", "That remote link has expired.");
            remotes.clear();
            deps.send(conn, { type: "host:created", room: code, token, remoteKey });
            return broadcast();
          }
          if ((msg.cmd === "debugAct2" || msg.cmd === "debugAct3") && conn !== hostConn)
            return error(conn, "not-host", "Only the TV can jump acts.");
          if (conn !== hostConn && !remotes.has(conn)) return error(conn, "not-host", "Only the TV or its remote can run the session.");
          return command(conn, msg.cmd, msg.step, msg.speed);
        case "player:leave":
          return disconnect(conn);
        case "player:join":
          return join(conn, msg.name, msg.table);
        case "player:strategy": {
          if (!player) return;
          const before = JSON.stringify([player.classical, player.tuning]);
          if (msg.classical) player.classical = msg.classical;
          if (msg.tuning) player.tuning = { greenDeg: snapDial(msg.tuning.greenDeg), redDeg: snapDial(msg.tuning.redDeg) };
          // A real change un-readies the player (a phone re-sends its plan on reconnect: that changes nothing).
          if (JSON.stringify([player.classical, player.tuning]) !== before && player.ready) {
            player.ready = false;
            disarmStart();
          }
          // The partner sees plans (and, from E2b, dials) change live.
          return broadcast();
        }
        case "player:ready":
          // Only in a lull; elsewhere there's nothing to be ready for.
          if (!player || phase !== "strategy") return;
          if (player.ready !== msg.ready) {
            player.ready = msg.ready;
            disarmStart();
          }
          return broadcast();
        case "player:valve":
          if (!player) return;
          return answer(player, msg.roundId, msg.valve);
      }
    },

    disconnect,

    /** Nobody connected and quiet for `ms`. */
    isIdle(ms: number) {
      return hostConn === null && remotes.size === 0 && players.every((p) => p.conn === null) && deps.now() - lastActivity > ms;
    },

    dispose() {
      clearTimer();
    },

    state,
  };
}

export type Room = ReturnType<typeof createRoom>;
