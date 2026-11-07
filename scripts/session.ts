// pnpm session
// A whole event session against an in-process station (no network), with a fake clock and a seeded RNG, so it is fast
// and the same every run. `pnpm smoke` covers the real WebSocket; this covers the session from lobby to debrief.
// Pacing: Act I and each act's first wave are manual (the script presses Next on each result; it closes one round
// early with Next and double-presses Next once, which must advance once); later waves run in auto at Relaxed.
//   four pairs join and a 9th player is turned away; the night shift (briefing, Act I by the rule over the radio, with
//   one player changing their mind; every round held) and the storm; a player drops out mid-wave and rejoins their seat; the TV
//   disconnects and resumes with its token; one Act II wave; the engineering report; the tool; two Act III waves with
//   tuned dials (A 0° / 45°, B 22.5° / 157.5°): each phone measures, then sets the pump its crystal suggests; the
//   pooled rate must be clearly above 75%, and the crew's dials average 85.4%, which saves the station; the storm
//   passes (saved) and the incident report. Then a reset and a short not-saved session (untuned dials, 75%).
import { ACT1_ROUNDS, MP_WAVE_SIZE, MP_RESULT_MS, MP_ROUND_MS, RELAXED_RESULT_MS, STORM_STATIC_MS } from "../src/config.ts";
import { OPTIMAL_TUNING, QUANTUM_LIMIT } from "../src/shared/chsh.ts";
import type { ClientMsg, HostCommand, RoomState, ServerMsg } from "../src/shared/protocol.ts";
import { mulberry32 } from "../src/shared/rng.ts";
import { createStation } from "../server/station.ts";
import { crewReport } from "../src/shared/report.ts";

const SEED = 20261030;

// --- A station with a fake clock -----------------------------------------------------------------

let now = 0;
let timers: { at: number; fn: () => void; id: number }[] = [];
let ids = 0;
const inbox = new Map<string, ServerMsg[]>();
const station = createStation({
  now: () => now,
  rng: mulberry32(SEED),
  schedule: (fn, ms) => {
    const id = ids++;
    timers.push({ at: now + ms, fn, id });
    return () => (timers = timers.filter((t) => t.id !== id));
  },
  send: (conn, msg) => inbox.set(conn, [...(inbox.get(conn) ?? []), msg]),
  newId: () => `id${ids++}`,
});

const send = (conn: string, msg: ClientMsg) => station.handle(conn, msg);
const msgs = (conn: string) => inbox.get(conn) ?? [];
const last = <T extends ServerMsg["type"]>(conn: string, type: T) =>
  msgs(conn).filter((m): m is Extract<ServerMsg, { type: T }> => m.type === type).at(-1);

/** Moves the clock forward, firing due timers in order. */
function advance(ms: number) {
  const end = now + ms;
  for (;;) {
    const due = timers.filter((t) => t.at <= end).sort((p, q) => p.at - q.at)[0];
    if (!due) break;
    timers = timers.filter((t) => t !== due);
    now = due.at;
    due.fn();
  }
  now = end;
}

let ok = true;
const check = (cond: boolean, what: string) => {
  console.log(`${cond ? "✓" : "✗"} ${what}`);
  ok &&= cond;
};

// --- The session -----------------------------------------------------------------------------------

let tv = "tv";
send(tv, { type: "host:create" });
const created = last(tv, "host:created")!;
const { room, token } = created;
const state = (): RoomState => last(tv, "room:state")!.state;
const host = (cmd: HostCommand) => send(tv, { type: "host:command", cmd });

// Phones: conn → seat. Each answers every round it's dealt: Act II always clockwise, Act III measure.
const seats = [
  ["Ada", "A"],
  ["Bo", "B"],
  ["Cy", "A"],
  ["Di", "B"],
  ["Ed", "A"],
  ["Flo", "B"],
  ["Gus", "A"],
  ["Hal", "B"],
] as const;
const phones = new Map<string, { name: string; table: "A" | "B"; online: boolean }>();
for (const [i, [name, table]] of seats.entries()) {
  const conn = `phone${i}`;
  send(conn, { type: "player:join", room, name, table });
  phones.set(conn, { name, table, online: true });
}
check(state().pairs.length === 4 && state().players.length === 8, `four pairs seated (${state().pairs.length} pairs)`);

send("late", { type: "player:join", room, name: "Ivy", table: "A" });
check(last("late", "error")?.code === "table-full", "a 9th player is turned away (table full)");

const answered = new Set<string>();
/** Act I: the pump each phone last sent per round. */
const sent = new Map<string, 0 | 1>();
/** Each online phone answers any round it hasn't answered yet. Act I, radio working: Table A calls clockwise, and
 *  Table B applies the rule to what the radio says (match A's pump unless both are HOT), again if A changes it. */
function answerAll() {
  for (const [conn, phone] of phones) {
    if (!phone.online) continue;
    for (const m of msgs(conn)) {
      if (m.type !== "round:start") continue;
      const key = `${conn}:${m.roundId}`;
      if (m.act === 1) {
        if (phone.table === "A") {
          if (!sent.has(key)) setPump(conn, m.roundId, 0);
          continue;
        }
        const heard = msgs(conn).filter((p) => p.type === "round:partner" && p.roundId === m.roundId).at(-1);
        const partnerPump = heard?.type === "round:partner" ? heard.pump : m.partner?.pump;
        if (partnerPump == null || !m.partner) continue;
        const want = (m.light === 1 && m.partner.light === 1 ? 1 - partnerPump : partnerPump) as 0 | 1;
        if (sent.get(key) !== want) setPump(conn, m.roundId, want);
        continue;
      }
      if (m.act === 3) {
        // Act III: MEASURE, then set the pump the crystal suggested.
        if (!answered.has(key)) {
          answered.add(key);
          send(conn, { type: "player:measure", roundId: m.roundId });
        }
        const measured = msgs(conn).find((r) => r.type === "round:measured" && r.roundId === m.roundId);
        if (measured?.type === "round:measured" && !sent.has(key)) setPump(conn, m.roundId, measured.crystal);
        continue;
      }
      if (answered.has(key)) continue;
      answered.add(key);
      send(conn, { type: "player:valve", roundId: m.roundId, valve: 0 });
    }
  }
}

function setPump(conn: string, roundId: string, valve: 0 | 1) {
  sent.set(`${conn}:${roundId}`, valve);
  send(conn, { type: "player:valve", roundId, valve });
}

/** Runs the clock until the room reaches `phase`, answering as rounds come. */
/** Manual results wait for the facilitator: press Next (with the room's step) when one is showing. */
const nextRound = () => send(tv, { type: "host:command", cmd: "next", step: state().step });
const paces = new Set<string>();

/** Runs the clock until the room reaches `phase`, answering as rounds come and pressing Next on manual results
 *  (auto moves on by its own timers). */
function playUntil(phase: RoomState["phase"], during?: (round: number) => void) {
  for (let steps = 0; steps < 20_000 && state().phase !== phase; steps++) {
    // Each tick: the facilitator (and drop-outs) first, then a manual result moves on, then the phones answer, so a
    // result always shows for at least one tick and the hook sees it.
    during?.(state().roundNo);
    if (state().phase === "round") paces.add(`${state().act}:${state().batchNo}:${state().auto ? "auto" : "manual"}`);
    if (state().phase === "roundResult" && !state().auto) nextRound();
    answerAll();
    advance(100);
  }
  return state().phase === phase;
}

// The night shift: the briefing, then Act I with the radio working. In round 2, once Bo has answered, Ada (Table A)
// changes her mind to anticlockwise; Bo hears it over the radio and follows. Every round holds.
host("startNightShift");
check(state().phase === "briefing" && state().act === 1, "the night shift starts with the briefing");
host("startBatch");
let changed = false;
const nightOk = playUntil("storm", (round) => {
  const id = `act1-${round}`;
  if (round !== 2 || changed || state().phase !== "round" || !sent.has(`phone1:${id}`)) return;
  setPump("phone0", id, 1);
  changed = true;
});
const heard = msgs("phone1").filter((m) => m.type === "round:partner" && m.roundId === "act1-2");
check(heard.length === 2 && sent.get("phone1:act1-2") !== undefined, "Bo heard Ada's change over the radio and followed");
check(nightOk && changed, `Act I: ${ACT1_ROUNDS} rounds with the radio working, and Ada changed her mind once`);
const act1 = state().stability.act1;
check(act1.rounds === 4 * ACT1_ROUNDS && act1.wins === act1.rounds, `Act I held every round (${act1.wins}/${act1.rounds})`);
check(state().stability.rolling === null, "the station gauge waits for the first storm wave");
check(state().deadline! - state().serverNow === STORM_STATIC_MS, "the storm: static, then the storm log");
advance(STORM_STATIC_MS);

// The lull, then Act II: one wave. Bo drops out in round 4 and rejoins (same name and table) in round 7.
host("startStrategy");
check(state().phase === "strategy" && state().act === 2, "the lull before the first wave");
// In the lull, Ada (pair 1) picks "reverse when HOT" and Cy (pair 2) "reverse when COOL"; Bo sees Ada's at once.
send("phone0", { type: "player:strategy", act: 2, classical: { onGreen: 0, onRed: 1 } });
send("phone2", { type: "player:strategy", act: 2, classical: { onGreen: 1, onRed: 0 } });
const boSees = last("phone1", "room:state")!.state.pairs[0]!.plans.a;
check(boSees.onGreen === 0 && boSees.onRed === 1, "Bo sees Ada's plan live in the lull");
// The facilitator's remote (E3b) pairs with the TV's key and starts the wave.
const remote = "remote";
send(remote, { type: "remote:pair", room, key: last(tv, "host:created")!.remoteKey });
check(last(remote, "remote:paired")?.room === room && state().remotes === 1, "the facilitator's remote paired with the TV's key");
send(remote, { type: "host:command", cmd: "startBatch", step: state().step });
check(state().phase === "round" && state().act === 2, "the remote started the wave");
let dropped = false;
let rejoined = false;
const bo = "phone1";
const boId = last(bo, "player:joined")!.playerId;
let closed = false;
let doubled = false;
let both = false;
const reached = playUntil("batchDone", (round) => {
  // Manual (the first wave): the facilitator closes round 2 early with Next, and presses Next twice on round 3's
  // result from the same step: the room advances once.
  if (round === 1 && !closed && state().phase === "roundResult") {
    nextRound(); // round 2 opens; nobody has chosen yet
    send(tv, { type: "host:command", cmd: "next", step: state().step });
    closed = state().phase === "roundResult" && state().roundNo === 2 && last(tv, "round:results")!.results.every((r) => r.timedOut);
  }
  if (round === 3 && !doubled && state().phase === "roundResult") {
    const step = state().step;
    send(tv, { type: "host:command", cmd: "next", step });
    send(tv, { type: "host:command", cmd: "next", step });
    doubled = state().roundNo === 4 && last(tv, "error")?.code === "stale";
  }
  // Round 6's result: the TV and the remote press Next from the same step; the room advances once.
  if (round === 6 && !both && state().phase === "roundResult") {
    const step = state().step;
    send(remote, { type: "host:command", cmd: "next", step });
    send(tv, { type: "host:command", cmd: "next", step });
    both = state().roundNo === 7 && last(tv, "error")?.code === "stale";
  }
  if (round === 4 && !dropped) {
    station.disconnect(bo);
    phones.get(bo)!.online = false;
    dropped = true;
  }
  if (round === 7 && dropped && !rejoined) {
    send("phone1b", { type: "player:join", room, name: "Bo", table: "B" });
    phones.set("phone1b", { name: "Bo", table: "B", online: true });
    rejoined = true;
  }
});
check(reached, "one full Act II wave");
check(paces.has("2:1:manual"), "the first wave was manual (no countdown; Next by the facilitator)");
check(closed, "Next ended a manual round early");
check(doubled, "a double Next round from the same step advanced once");
check(both, "the remote and the TV pressed Next together: it advanced once");
check(state().lastBatch?.rounds === 4 * MP_WAVE_SIZE, `the wave scored ${state().lastBatch?.rounds} pair-rounds`);
const tried = [...state().triedPlans].sort().join(" ");
check(tried === "0-0 1-0 2-0", `the plans locked at the wave start are recorded as tried (${tried})`);
check(
  state().pairs.every((p) => p.locked !== null && p.lastWave?.rounds === MP_WAVE_SIZE),
  "every pair has its locked plans and its own wave score",
);
const back = last("phone1b", "player:joined");
check(!!back && back.playerId === boId, "Bo dropped out mid-wave and rejoined the same seat");
check(state().players.find((p) => p.id === boId)?.connected === true, "Bo is connected again");
const boPair = state().pairs.find((p) => p.b.playerId === boId)!;
check(boPair.lastWave?.timeouts === 1, "while Bo was away CORA covered the seat (the only too-slow round is the one closed early)");

// The TV page is refreshed: it resumes with its token.
station.disconnect(tv);
tv = "tv2";
send(tv, { type: "host:resume", room, token });
check(last(tv, "host:created")?.room === room && state().phase === "batchDone", "the TV resumed with its token");

// The engineering report, then the tool.
host("revealCeiling");
check(state().phase === "ceiling" && state().ceilingRevealed, "the engineering report");
host("unlockTool");
check(state().phase === "tool" && state().act === 3, "the tool");

// Act III: tuned dials (Table A 0° / 45°, Table B 22.5° / 157.5°), two waves.
for (const [conn, phone] of phones) {
  if (phone.online) send(conn, { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING[phone.table] });
}
for (let wave = 1; wave <= 2; wave++) {
  host("startBatch");
  check(playUntil("batchDone"), `Act III wave ${wave}`);
}
const act3 = state().stability.act3;
const rate = act3.rounds ? act3.wins / act3.rounds : 0;
check(act3.rounds === 2 * 4 * MP_WAVE_SIZE, `Act III scored ${act3.rounds} pair-rounds`);
check(rate >= 0.78, `pooled Act III rate ${(rate * 100).toFixed(1)}% is clearly above 75%`);
check(
  paces.has("3:2:manual") && paces.has("3:3:auto"),
  `Act III: the first wave manual, the next auto (by its own timers) [${[...paces].filter((p) => p.startsWith("3:")).join(" ")}]`,
);
const crew = state().crewDialsRate ?? 0;
check(Math.abs(crew - QUANTUM_LIMIT) < 1e-9 && state().stationSaved, `the crew's dials average ${(crew * 100).toFixed(1)}%: saved`);
const followed = state().act3Followed;
check(!!followed && followed.of === 8 * MP_WAVE_SIZE && followed.n === followed.of, "every player followed their crystal (latest wave)");

// The saved ending: the storm passes (the crew's dials saved the station), then the incident report.
host("stormPasses");
check(state().phase === "resolution" && state().stationSaved, "the storm passes: saved");
host("debrief");
check(state().phase === "debrief" && !!state().marginals, "the incident report, with the no-signalling numbers");
const saved = crewReport(state());
check(
  saved.act1 === 1 && Math.abs((saved.act3 ?? 0) - QUANTUM_LIMIT) < 1e-9 && saved.bestPair !== null,
  `the report: Act I ${(saved.act1 ?? 0) * 100}%, the crew's dials ${((saved.act3 ?? 0) * 100).toFixed(1)}%, best pair ${saved.bestPair?.pairId}`,
);
for (let i = 0; i < 3; i++) host("reportNext");
check(state().debriefStep === 3, "the report steps forward to the credits");

// The not-saved ending: a reset (players stay; dials go back to 0°), straight into Act II from the lobby, the tool
// and one untuned Act III wave. Every pair's dials agree, so each scores exactly 75%: not saved.
host("reset");
answered.clear();
sent.clear();
for (const conn of phones.keys()) inbox.set(conn, []);
host("startBatch");
// After the reset (so the main session keeps the default schedule): Play on a waiting manual result takes effect at
// once (its timer starts now); Pause takes it away again.
let switched = false;
const afterReset = playUntil("batchDone", (round) => {
  if (round !== 2 || switched || state().phase !== "roundResult") return;
  send(tv, { type: "host:command", cmd: "auto", step: state().step });
  const timed = state().auto && state().deadline! - state().serverNow === RELAXED_RESULT_MS;
  send(tv, { type: "host:command", cmd: "manual", step: state().step });
  switched = timed && !state().auto && state().deadline === null;
});
check(afterReset, "after a reset: an Act II wave straight from the lobby");
check(switched, "Play on a waiting result started its timer at once; Pause stopped it");
host("revealCeiling");
host("unlockTool");
host("startBatch");
check(playUntil("batchDone"), "one untuned Act III wave");
host("stormPasses");
check(state().phase === "resolution" && !state().stationSaved, "the storm passes: not saved");
host("debrief");
const notSaved = crewReport(state());
check(
  notSaved.act1 === null && notSaved.act3 === 0.75 && notSaved.bestPair === null && !notSaved.saved,
  "the report: no night shift, the crew's dials 75.0%, no pair at 80% (the best dials lead)",
);

console.log(`Session: ${((now / 1000) | 0)} s of station time (round ${MP_ROUND_MS} ms, result ${MP_RESULT_MS} ms)`);
process.exit(ok ? 0 : 1);
