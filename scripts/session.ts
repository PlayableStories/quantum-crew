// pnpm session
// A whole event session against an in-process station (no network), with a fake clock and a seeded RNG, so it is fast
// and the same every run. `pnpm smoke` covers the real WebSocket; this covers the session from lobby to debrief:
//   four pairs join and a 9th player is turned away; the night shift (briefing, Act I by the rule over the radio, with
//   one player changing their mind; every round held) and the storm; a player drops out mid-wave and rejoins their seat; the TV
//   disconnects and resumes with its token; one Act II wave; the engineering report; the tool; two Act III waves with
//   tuned dials (A 0° / 45°, B 22.5° / 157.5°), whose pooled rate must be clearly above 75%; the debrief.
import { ACT1_ROUNDS, BATCH_SIZE, MP_RESULT_MS, MP_ROUND_MS, STORM_STATIC_MS } from "../src/config.ts";
import { OPTIMAL_TUNING } from "../src/shared/chsh.ts";
import type { ClientMsg, HostCommand, RoomState, ServerMsg } from "../src/shared/protocol.ts";
import { mulberry32 } from "../src/shared/rng.ts";
import { createStation } from "../server/station.ts";

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
      if (answered.has(key)) continue;
      answered.add(key);
      if (m.act === 2) send(conn, { type: "player:valve", roundId: m.roundId, valve: 0 });
      else send(conn, { type: "player:measure", roundId: m.roundId });
    }
  }
}

function setPump(conn: string, roundId: string, valve: 0 | 1) {
  sent.set(`${conn}:${roundId}`, valve);
  send(conn, { type: "player:valve", roundId, valve });
}

/** Runs the clock until the room reaches `phase`, answering as rounds come. */
function playUntil(phase: RoomState["phase"], during?: (round: number) => void) {
  for (let steps = 0; steps < 10_000 && state().phase !== phase; steps++) {
    answerAll();
    during?.(state().roundNo);
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
host("startBatch");
let dropped = false;
let rejoined = false;
const bo = "phone1";
const boId = last(bo, "player:joined")!.playerId;
const reached = playUntil("batchDone", (round) => {
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
check(state().lastBatch?.rounds === 4 * BATCH_SIZE, `the wave scored ${state().lastBatch?.rounds} pair-rounds`);
const tried = [...state().triedPlans].sort().join(" ");
check(tried === "0-0 1-0 2-0", `the plans locked at the wave start are recorded as tried (${tried})`);
check(
  state().pairs.every((p) => p.locked !== null && p.lastWave?.rounds === BATCH_SIZE),
  "every pair has its locked plans and its own wave score",
);
const back = last("phone1b", "player:joined");
check(!!back && back.playerId === boId, "Bo dropped out mid-wave and rejoined the same seat");
check(state().players.find((p) => p.id === boId)?.connected === true, "Bo is connected again");

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
check(act3.rounds === 2 * 4 * BATCH_SIZE, `Act III scored ${act3.rounds} pair-rounds`);
check(rate >= 0.78, `pooled Act III rate ${(rate * 100).toFixed(1)}% is clearly above 75%`);

// The debrief.
host("debrief");
check(state().phase === "debrief" && !!state().marginals, "the debrief, with the no-signalling numbers");

console.log(`Session: ${((now / 1000) | 0)} s of station time (round ${MP_ROUND_MS} ms, result ${MP_RESULT_MS} ms)`);
process.exit(ok ? 0 : 1);
