import { describe, expect, it } from "vitest";
import {
  ACT1_ROUNDS,
  ACT1_SETTLE_MS,
  MP_WAVE_SIZE,
  MP_ACT1_RESULT_MS,
  MP_ACT1_ROUND_MS,
  MP_RESULT_MS,
  MP_ROUND_MS,
  ROLLING_WINDOW,
  STORM_STATIC_MS,
  CORA_DELAY_MS,
  RELAXED_ACT1_ROUND_MS,
  RELAXED_RESULT_MS,
  RELAXED_ROUND_MS,
  DEFAULT_TUNING,
} from "../src/config.ts";
import type { ClientMsg, RoomState, Speed, ServerMsg } from "../src/shared/protocol.ts";
import { OPTIMAL_TUNING, QUANTUM_LIMIT, matchProbability, quantumExpectedWinRate } from "../src/shared/chsh.ts";
import { CLUE_SETTINGS, RULE_GAPS, coraPlan, pairRateFor } from "../src/shared/crystalPlan.ts";
import { mulberry32 } from "../src/shared/rng.ts";
import { BOT_NAME } from "./room.ts";
import { createStation } from "./station.ts";

/** A station with a fake clock and timers, recording every message per connection. Most tests run in auto at Brisk
 *  (the original timers); the pacing tests pass `null` for the default (manual first waves, auto later). */
function setup(seed = 1, speed: Speed | null = "brisk") {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 0;
  const inbox = new Map<string, ServerMsg[]>();
  const station = createStation({
    now: () => now,
    rng: mulberry32(seed),
    schedule: (fn, ms) => {
      const id = nextId++;
      timers.push({ at: now + ms, fn, id });
      return () => (timers = timers.filter((t) => t.id !== id));
    },
    send: (conn, msg) => inbox.set(conn, [...(inbox.get(conn) ?? []), msg]),
    newId: () => `id${nextId++}`,
  });

  const send = (conn: string, msg: ClientMsg) => station.handle(conn, msg);
  const msgs = (conn: string) => inbox.get(conn) ?? [];
  const last = <T extends ServerMsg["type"]>(conn: string, type: T) =>
    msgs(conn).filter((m): m is Extract<ServerMsg, { type: T }> => m.type === type).at(-1);
  const roomState = (conn: string): RoomState => last(conn, "room:state")!.state;
  /** Moves the clock forward, firing due timers in order. */
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= end).sort((p, q) => p.at - q.at)[0];
      if (!due) break;
      timers = timers.filter((t) => t !== due);
      now = due.at;
      due.fn();
    }
    now = end;
  };
  const clear = (conn: string) => inbox.set(conn, []);

  send("tv", { type: "host:create" });
  const room = last("tv", "host:created")!.room;
  const join = (conn: string, name: string, table: "A" | "B") => send(conn, { type: "player:join", room, name, table });
  const host = (cmd: Extract<ClientMsg, { type: "host:command" }>["cmd"]) => send("tv", { type: "host:command", cmd });
  if (speed) send("tv", { type: "host:command", cmd: "setSpeed", speed });

  return { station, send, msgs, last, roomState, advance, clear, room, join, host };
}

describe("rooms and pairing", () => {
  it("creates a 4-letter room and pairs A_i with B_i, with a bot in empty seats", () => {
    const t = setup();
    expect(t.room).toMatch(/^[A-Z]{4}$/);
    t.join("p1", "Ada", "A");
    t.join("p2", "Bo", "B");
    t.join("p3", "Cy", "A");
    const { pairs, players } = t.roomState("tv");
    expect(players).toHaveLength(3);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.a.name).toBe("Ada");
    expect(pairs[0]!.b.name).toBe("Bo");
    expect(pairs[1]!.a.name).toBe("Cy");
    expect(pairs[1]!.b).toEqual({ playerId: null, name: BOT_NAME });
    expect(BOT_NAME).toBe("CORA"); // the solo crewmate fills empty seats too
  });

  it("rejects unknown rooms and full tables", () => {
    const t = setup();
    t.send("x", { type: "player:join", room: "ZZZZ", name: "Q", table: "A" });
    expect(t.last("x", "error")!.code).toBe("no-room");
    for (let i = 0; i < 4; i++) t.join(`a${i}`, `A${i}`, "A");
    t.join("a4", "A4", "A");
    expect(t.last("a4", "error")!.code).toBe("table-full");
  });

  it("only the host can run the session", () => {
    const t = setup();
    t.join("p1", "Ada", "A");
    t.send("p1", { type: "host:command", cmd: "startBatch" });
    expect(t.last("p1", "error")!.code).toBe("not-host");
    expect(t.roomState("tv").phase).toBe("lobby");
  });

  it("a player who reconnects with the same name and table gets their seat and live light back", () => {
    const t = setup();
    t.join("p1", "Ada", "A");
    t.join("p2", "Bo", "B");
    const id = t.last("p1", "player:joined")!.playerId;
    t.host("startBatch");
    const light = t.last("p1", "round:start")!.light;
    t.station.disconnect("p1");
    expect(t.roomState("tv").players.find((p) => p.id === id)!.connected).toBe(false);
    t.join("p1b", "ada", "A");
    expect(t.last("p1b", "player:joined")!.playerId).toBe(id);
    expect(t.last("p1b", "round:start")!.light).toBe(light);
    expect(t.roomState("tv").players).toHaveLength(2);
  });

  it("the host can resume with its token, not without", () => {
    const t = setup();
    const token = t.last("tv", "host:created")!.token;
    t.send("tv2", { type: "host:resume", room: t.room, token: "nope" });
    expect(t.last("tv2", "error")!.code).toBe("not-host");
    t.send("tv3", { type: "host:resume", room: t.room, token });
    expect(t.last("tv3", "host:created")!.room).toBe(t.room);
  });
});

describe("Act II rounds", () => {
  it("each phone gets only its own light, and a full batch scores every pair", () => {
    const t = setup(7);
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.join("a2", "Cy", "A");
    t.host("startStrategy");
    expect(t.roomState("tv").phase).toBe("strategy");
    t.host("startBatch"); // the lull is untimed: the facilitator starts the wave
    for (let r = 1; r <= MP_WAVE_SIZE; r++) {
      expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: r });
      for (const conn of ["a1", "b1", "a2"]) {
        const start = t.last(conn, "round:start")!;
        expect(start.roundId).toBe(`1-${r}`);
        expect(Object.keys(start).sort()).toEqual(["act", "deadline", "light", "roundId", "serverNow", "type"]);
        // Everyone always OPENs; round:start never carries anyone else's light.
        t.send(conn, { type: "player:valve", roundId: start.roundId, valve: 0 });
      }
      // All answered (CORA, pair 2, after her natural delay): resolved without waiting for the deadline.
      t.advance(CORA_DELAY_MS[1]);
      expect(t.roomState("tv").phase).toBe("roundResult");
      expect(t.last("tv", "round:results")!.results).toHaveLength(2);
      expect(t.last("a1", "round:result")!.pairId).toBe(1);
      t.advance(MP_RESULT_MS);
    }
    const s = t.roomState("tv");
    expect(s.phase).toBe("batchDone");
    expect(s.lastBatch!.rounds).toBe(2 * MP_WAVE_SIZE);
    expect(s.stability.act2.rounds).toBe(2 * MP_WAVE_SIZE);
    expect(s.pairs[0]!.act2.rounds).toBe(MP_WAVE_SIZE);
    // Always-OPEN loses exactly the both-RED rounds.
    expect(s.stability.act2.timeouts).toBe(0);
    expect(s.stability.rolling).toBeCloseTo(s.stability.act2.wins / s.stability.act2.rounds, 10);
    // No state message ever reveals a light.
    for (const conn of ["a1", "b1", "a2", "tv"])
      for (const m of t.msgs(conn)) if (m.type === "room:state") expect(JSON.stringify(m)).not.toMatch(/"light"|"x"|"y"/);
  });

  it("a missing answer times out as a loss at the deadline", () => {
    const t = setup();
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    expect(t.roomState("tv").pairs[0]!.answered).toEqual({ a: true, b: false });
    t.advance(MP_ROUND_MS);
    expect(t.last("a1", "round:result")).toMatchObject({ win: false, timedOut: true });
    // A late answer is ignored.
    t.send("b1", { type: "player:valve", roundId: id, valve: 0 });
    expect(t.roomState("tv").stability.act2).toEqual({ rounds: 1, wins: 0, timeouts: 1 });
  });

  it("pooled stability is a rolling window; ceiling and reset work", () => {
    const t = setup();
    t.join("a1", "Ada", "A");
    for (let b = 0; b < 7; b++) {
      t.host("startBatch");
      t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    }
    const s = t.roomState("tv");
    expect(s.stability.act2.rounds).toBe(7 * MP_WAVE_SIZE);
    expect(s.stability.rolling).toBe(0); // Ada never answered
    expect(s.batchNo).toBe(7);
    expect(7 * MP_WAVE_SIZE).toBeGreaterThan(ROLLING_WINDOW);
    t.host("revealCeiling");
    expect(t.roomState("tv")).toMatchObject({ phase: "ceiling", ceilingRevealed: true });
    t.host("startBatch");
    expect(t.last("tv", "error")!.code).toBe("not-now");
    t.host("reset");
    expect(t.roomState("tv")).toMatchObject({ phase: "lobby", batchNo: 0, ceilingRevealed: false });
    expect(t.roomState("tv").stability.act2.rounds).toBe(0);
    expect(t.roomState("tv").players).toHaveLength(1);
  });

  it("players joining mid-batch are seated after it", () => {
    const t = setup();
    t.join("a1", "Ada", "A");
    t.host("startBatch");
    t.join("b1", "Bo", "B");
    expect(t.roomState("tv").pairs[0]!.b.playerId).toBeNull();
    expect(t.last("b1", "round:start")).toBeUndefined();
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("startBatch");
    expect(t.roomState("tv").pairs[0]!.b.name).toBe("Bo");
    expect(t.last("b1", "round:start")).toBeDefined();
  });
});

describe("Act III rounds", () => {
  /** Two human pairs (tuned optimally) plus one human with an AI crewmate. */
  function act3Room(seed: number) {
    const t = setup(seed);
    const seats = [
      ["a1", "Ada", "A"],
      ["b1", "Bo", "B"],
      ["a2", "Cy", "A"],
      ["b2", "Di", "B"],
      ["a3", "Ed", "A"],
    ] as const;
    for (const [conn, name, table] of seats) t.join(conn, name, table);
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
    for (const [conn, , table] of seats) t.send(conn, { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING[table] });
    return { t, conns: seats.map((s) => s[0]) };
  }

  /** Plays `batches` batches; `order` picks which phones answer first in each round. Each phone sets the pump its
   *  crystal suggested at round start (`follow`), or the other one. */
  function play(
    t: ReturnType<typeof setup>,
    conns: readonly string[],
    batches: number,
    order: (round: number) => string[],
    follow: (conn: string) => boolean = () => true,
  ) {
    for (let b = 0; b < batches; b++) {
      t.host("startBatch");
      for (let r = 0; r < MP_WAVE_SIZE; r++) {
        for (const conn of order(r).filter((c) => conns.includes(c))) {
          const { roundId, crystal } = t.last(conn, "round:start")!;
          t.send(conn, { type: "player:valve", roundId, valve: (follow(conn) ? crystal! : 1 - crystal!) as 0 | 1 });
        }
        t.advance(CORA_DELAY_MS[1] + MP_RESULT_MS + 1); // CORA's pair resolves after her natural delay
      }
      t.advance(MP_RESULT_MS);
    }
  }

  it("unlocks the tool into Act III; the round starts with this phone's setting and crystal, and sets no pump", () => {
    const { t } = act3Room(1);
    expect(t.roomState("tv")).toMatchObject({ phase: "tool", act: 3, toolUnlocked: true, clue: 1 });
    t.host("startBatch");
    const start = t.last("a1", "round:start")!;
    expect(start).toMatchObject({ act: 3, dialDeg: OPTIMAL_TUNING.A[start.light === 0 ? "greenDeg" : "redDeg"] });
    expect([0, 1]).toContain(start.crystal);
    expect(t.roomState("tv").pairs[0]!.answered.a).toBe(false);
    t.send("a1", { type: "player:valve", roundId: start.roundId, valve: 0 }); // one tap: the pump
    expect(t.roomState("tv").pairs[0]!.answered.a).toBe(true);
  });

  it("no phone ever receives its partner's sensor or crystal during a round", () => {
    const { t, conns } = act3Room(2);
    for (const c of conns) t.clear(c);
    play(t, conns, 3, () => [...conns]);
    for (const conn of conns) {
      for (const m of t.msgs(conn)) {
        if (m.type === "round:start") {
          expect(Object.keys(m).sort()).toEqual(["act", "crystal", "deadline", "dialDeg", "light", "roundId", "serverNow", "type"]);
          expect(m).not.toHaveProperty("partner");
        }
        // Nothing else carries a crystal; the result (after the round) names both sensors and pumps, never crystals.
        if (m.type !== "round:start") expect(JSON.stringify(m)).not.toMatch(/crystal"/);
      }
    }
  });

  it("the pump set is what scores, even against the crystal; followed counts only players' answered pumps", () => {
    const { t } = act3Room(6);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    const crystalA = t.last("a1", "round:start")!.crystal!;
    const crystalB = t.last("b1", "round:start")!.crystal!;
    t.send("a1", { type: "player:valve", roundId: id, valve: (1 - crystalA) as 0 | 1 }); // Ada goes her own way
    t.send("b1", { type: "player:valve", roundId: id, valve: crystalB });
    t.advance(MP_ROUND_MS); // pair 2 and Ed time out
    const result = t.last("a1", "round:result")!;
    expect(result.a).toBe(1 - crystalA);
    expect(result.b).toBe(crystalB);
    const s = t.roomState("tv");
    expect(s.pairs[0]!.followed).toEqual({ n: 1, of: 2 });
    expect(s.pairs[1]!.followed).toEqual({ n: 0, of: 0 }); // timeouts aren't counted
    expect(s.pairs[2]!.followed).toEqual({ n: 0, of: 0 }); // CORA isn't counted
  });

  it("CORA in an empty seat follows her crystal", () => {
    const { t, conns } = act3Room(7);
    t.clear("a3"); // drop the Act II wave's results
    play(t, conns, 1, () => [...conns]);
    const results = t.msgs("a3").filter((m) => m.type === "round:result");
    expect(results).toHaveLength(MP_WAVE_SIZE);
    expect(results.every((m) => m.type === "round:result" && m.b !== null)).toBe(true);
  });

  it.each([
    ["A first", () => ["a1", "a2", "a3", "b1", "b2"]],
    ["B first", () => ["b1", "b2", "a1", "a2", "a3"]],
    ["alternating", (r: number) => (r % 2 ? ["a1", "a2", "a3", "b1", "b2"] : ["b2", "b1", "a3", "a2", "a1"])],
  ])("optimal crystal plans beat the classical limit, whoever answers first (%s)", (_, order) => {
    const { t, conns } = act3Room(3);
    play(t, conns, 80, order);
    const { act3 } = t.roomState("tv").stability;
    expect(act3.rounds).toBe(80 * MP_WAVE_SIZE * 3);
    expect(act3.timeouts).toBe(0);
    expect(Math.abs(act3.wins / act3.rounds - QUANTUM_LIMIT)).toBeLessThan(0.025);
  });

  it("no-signalling: every seat's OPEN rate is ≈ 50% whatever its partner saw (debrief only)", () => {
    const { t, conns } = act3Room(4);
    play(t, conns, 80, (r) => (r % 2 ? ["a1", "a2", "a3", "b1", "b2"] : ["b1", "b2", "a1", "a2", "a3"]));
    expect(t.roomState("tv").marginals).toBeNull();
    t.host("debrief");
    const { rows, crew } = t.roomState("tv").marginals!;
    expect(crew.rounds).toBe(6 * 80 * MP_WAVE_SIZE);
    expect(Math.abs(crew.partnerGreen! - 0.5)).toBeLessThan(0.03);
    expect(Math.abs(crew.partnerRed! - 0.5)).toBeLessThan(0.03);
    expect(rows.map((r) => r.name).sort()).toEqual(["Ada", "Bo", `${BOT_NAME} (pair 3)`, "Cy", "Di", "Ed"].sort());
    for (const row of rows) {
      expect(row.rounds).toBe(80 * MP_WAVE_SIZE);
      expect(Math.abs(row.partnerGreen! - 0.5)).toBeLessThan(0.07);
      expect(Math.abs(row.partnerRed! - 0.5)).toBeLessThan(0.07);
    }
  });

  it("a timeout in Act III is a loss; tunings snap to the dial", () => {
    const { t } = act3Room(5);
    t.send("a1", { type: "player:strategy", act: 3, tuning: { greenDeg: 46, redDeg: -22 } });
    t.host("startBatch");
    const start = t.last("a1", "round:start")!;
    expect(start.dialDeg).toBe(start.light === 0 ? 45 : 157.5);
    t.clear("a1");
    t.advance(MP_ROUND_MS - 1);
    expect(t.last("a1", "round:result")).toBeUndefined();
    t.advance(1);
    expect(t.last("a1", "round:result")).toMatchObject({ win: false, timedOut: true });
  });
});

describe("Act I: the night shift and the storm", () => {
  type T = ReturnType<typeof setup>;
  /** The rule with both readings on the radio: match the partner's pump, unless both are HOT (then reverse it). */
  const byRule = (mine: 0 | 1, partner: { light: 0 | 1; pump: 0 | 1 }) =>
    (mine === 1 && partner.light === 1 ? 1 - partner.pump : partner.pump) as 0 | 1;

  function toBriefing(t: T, conns: [string, string, "A" | "B"][]) {
    for (const [conn, name, table] of conns) t.join(conn, name, table);
    t.host("startNightShift");
  }

  it("lobby → briefing → Act I rounds → storm → the lull, with the old shortcuts kept", () => {
    const t = setup(3);
    toBriefing(t, [["a1", "Ada", "A"]]);
    expect(t.roomState("tv")).toMatchObject({ phase: "briefing", act: 1 });
    t.host("startStrategy"); // not from the briefing
    expect(t.last("tv", "error")!.code).toBe("not-now");
    t.host("startBatch");
    expect(t.roomState("tv")).toMatchObject({ phase: "round", act: 1, roundNo: 1, batchNo: 0 });
    for (let r = 1; r <= ACT1_ROUNDS; r++) {
      expect(t.last("a1", "round:start")!.roundId).toBe(`act1-${r}`);
      t.advance(MP_ACT1_ROUND_MS + MP_ACT1_RESULT_MS);
    }
    const storm = t.roomState("tv");
    expect(storm).toMatchObject({ phase: "storm", act: 1 });
    expect(storm.deadline! - storm.serverNow).toBe(STORM_STATIC_MS);
    expect(storm.stability.act1.rounds).toBe(ACT1_ROUNDS);
    expect(storm.stability.rolling).toBeNull(); // the station gauge starts with the first wave
    t.host("startStrategy");
    expect(t.roomState("tv")).toMatchObject({ phase: "strategy", act: 2 });
    t.host("startBatch");
    expect(t.roomState("tv")).toMatchObject({ phase: "round", act: 2, batchNo: 1 });
    expect(t.last("a1", "round:start")!.roundId).toBe("1-1");

    // From the lobby, Start the wave still goes straight to Act II.
    const u = setup(4);
    u.join("a1", "Ada", "A");
    u.host("startBatch");
    expect(u.roomState("tv")).toMatchObject({ phase: "round", act: 2, batchNo: 1 });
  });

  it("each pair sees every sensor combination, never a double HOT first", () => {
    const t = setup(11);
    toBriefing(t, [["a1", "Ada", "A"], ["b1", "Bo", "B"], ["a2", "Cy", "A"], ["b2", "Di", "B"]]);
    t.host("startBatch");
    const seen = new Map<string, string[]>();
    for (let r = 1; r <= ACT1_ROUNDS; r++) {
      for (const [a, b] of [["a1", "b1"], ["a2", "b2"]] as const) {
        const sa = t.last(a, "round:start")!;
        const sb = t.last(b, "round:start")!;
        // The radio: each phone hears its partner's reading.
        expect(sa.partner!.light).toBe(sb.light);
        expect(sb.partner!.light).toBe(sa.light);
        seen.set(a, [...(seen.get(a) ?? []), `${sa.light}${sb.light}`]);
      }
      t.advance(MP_ACT1_ROUND_MS + MP_ACT1_RESULT_MS);
    }
    for (const order of seen.values()) {
      expect(new Set(order)).toEqual(new Set(["00", "01", "10", "11"]));
      expect(order[0]).not.toBe("11");
    }
  });

  it("the partner hears each tap; the last tap counts; the round ends once pumps settle", () => {
    const t = setup(5);
    toBriefing(t, [["a1", "Ada", "A"], ["b1", "Bo", "B"]]);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    const a = t.last("a1", "round:start")!;
    const b = t.last("b1", "round:start")!;
    expect(a.partner).toEqual({ light: b.light, pump: null });
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    expect(t.last("b1", "round:partner")).toEqual({ type: "round:partner", roundId: id, pump: 0 });
    // Bo sets the wrong pump, then changes it: the last tap counts.
    const right = byRule(b.light, { light: a.light, pump: 0 });
    t.send("b1", { type: "player:valve", roundId: id, valve: (1 - right) as 0 | 1 });
    t.advance(ACT1_SETTLE_MS - 100);
    expect(t.roomState("tv").phase).toBe("round"); // not settled yet
    t.send("b1", { type: "player:valve", roundId: id, valve: right });
    expect(t.last("a1", "round:partner")!.pump).toBe(right);
    t.advance(ACT1_SETTLE_MS - 100);
    expect(t.roomState("tv").phase).toBe("round"); // the change restarted the settle clock
    t.advance(100);
    const s = t.roomState("tv");
    expect(s.phase).toBe("roundResult");
    const result = t.last("a1", "round:result")!;
    expect(result).toMatchObject({ win: true, x: a.light, y: b.light, a: 0, b: right });
    expect(["circulate", "carry", "purge"]).toContain(result.cause);
    expect(t.last("tv", "round:results")!.results[0]!.cause).toBe(result.cause);
  });

  it("a pump that isn't set by the deadline is too slow", () => {
    const t = setup(6);
    toBriefing(t, [["a1", "Ada", "A"], ["b1", "Bo", "B"]]);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    t.advance(MP_ACT1_ROUND_MS - 1);
    expect(t.roomState("tv").phase).toBe("round");
    t.advance(1);
    expect(t.last("a1", "round:result")).toMatchObject({ win: false, timedOut: true, cause: "slow", b: null });
  });

  it("CORA in an empty seat calls her reading and a random pump at the start of each round", () => {
    const t = setup(9);
    toBriefing(t, [["a1", "Ada", "A"]]);
    t.host("startBatch");
    const pumps: (0 | 1)[] = [];
    for (let r = 1; r <= ACT1_ROUNDS; r++) {
      const start = t.last("a1", "round:start")!;
      // Her reading comes at once; her pump over the radio after a natural delay.
      expect(start.partner!.pump).toBeNull();
      t.advance(CORA_DELAY_MS[1]);
      const call = t.last("a1", "round:partner")!;
      expect(call.roundId).toBe(start.roundId);
      pumps.push(call.pump);
      t.send("a1", { type: "player:valve", roundId: start.roundId, valve: byRule(start.light, { light: start.partner!.light, pump: call.pump }) });
      t.advance(ACT1_SETTLE_MS); // only Ada had to set hers
      expect(t.last("a1", "round:result")!.win).toBe(true);
      t.advance(MP_ACT1_RESULT_MS);
    }
    expect(new Set(pumps).size).toBe(2); // she doesn't always turn the same way (seeded)
    const s = t.roomState("tv");
    expect(s.stability.act1).toEqual({ rounds: ACT1_ROUNDS, wins: ACT1_ROUNDS, timeouts: 0 });
    expect(s.pairs[0]!.act1.wins).toBe(ACT1_ROUNDS);
  });

  it("a phone that rejoins mid-round gets its reading, the partner's call and its own pump back", () => {
    const t = setup(12);
    toBriefing(t, [["a1", "Ada", "A"], ["b1", "Bo", "B"]]);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    const light = t.last("a1", "round:start")!.light;
    t.send("a1", { type: "player:valve", roundId: id, valve: 1 });
    t.send("b1", { type: "player:valve", roundId: id, valve: 0 });
    t.station.disconnect("a1");
    t.join("a1b", "Ada", "A");
    const again = t.last("a1b", "round:start")!;
    expect(again).toMatchObject({ roundId: id, light, pump: 1, partner: { pump: 0 } });
  });

  it("reset goes back to the lobby before the night shift", () => {
    const t = setup(2);
    toBriefing(t, [["a1", "Ada", "A"]]);
    t.host("startBatch");
    t.advance(MP_ACT1_ROUND_MS + MP_ACT1_RESULT_MS);
    t.host("reset");
    expect(t.roomState("tv")).toMatchObject({ phase: "lobby", act: 1, roundNo: 0 });
    expect(t.roomState("tv").stability.act1.rounds).toBe(0);
  });
});

describe("Act II plans (E2a)", () => {
  const always = { onGreen: 0, onRed: 0 } as const;
  const revHot = { onGreen: 0, onRed: 1 } as const;
  const revCool = { onGreen: 1, onRed: 0 } as const;

  it("a plan change reaches the partner at once; CORA's seat shows standard procedure", () => {
    const t = setup(21);
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.join("a2", "Cy", "A");
    t.host("startStrategy");
    t.clear("b1");
    t.send("a1", { type: "player:strategy", act: 2, classical: revHot });
    const s = t.roomState("b1");
    expect(s.pairs[0]!.plans).toEqual({ a: revHot, b: always });
    expect(s.pairs[1]!.plans.b).toEqual(always); // CORA
    expect(s.pairs[0]!.locked).toBeNull();
  });

  it("plans lock when the wave starts; a change mid-wave doesn't move the lock; pairings are recorded as tried", () => {
    const t = setup(22);
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.send("a1", { type: "player:strategy", act: 2, classical: revHot });
    t.send("b1", { type: "player:strategy", act: 2, classical: revCool });
    t.host("startBatch");
    t.send("a1", { type: "player:strategy", act: 2, classical: always });
    const s = t.roomState("tv");
    expect(s.pairs[0]!.locked).toEqual({ a: revHot, b: revCool });
    expect(s.pairs[0]!.plans.a).toEqual(always);
    expect(s.triedPlans).toEqual(["1-2"]);
    for (let r = 1; r <= MP_WAVE_SIZE; r++) t.advance(MP_ROUND_MS + MP_RESULT_MS);
    const done = t.roomState("tv");
    expect(done.phase).toBe("batchDone");
    expect(done.pairs[0]!.lastWave).toEqual({ rounds: MP_WAVE_SIZE, wins: 0, timeouts: MP_WAVE_SIZE });
    // The next wave locks the new plan and adds its pairing.
    t.host("startBatch");
    expect(t.roomState("tv").pairs[0]!.locked).toEqual({ a: always, b: revCool });
    expect(t.roomState("tv").triedPlans.sort()).toEqual(["0-2", "1-2"]);
    expect(t.roomState("tv").pairs[0]!.lastWave).toEqual({ rounds: 0, wins: 0, timeouts: 0 });
  });

  it("results carry the cause and both pumps; reset clears plans, locks and pairings", () => {
    const t = setup(23);
    t.join("a1", "Ada", "A");
    t.host("startBatch");
    const start = t.last("a1", "round:start")!;
    t.send("a1", { type: "player:valve", roundId: start.roundId, valve: 0 });
    t.advance(CORA_DELAY_MS[1]);
    const result = t.last("a1", "round:result")!;
    expect(result.a).toBe(0);
    expect(result.b).toBe(0); // CORA, always clockwise
    expect(result.cause).toMatch(/circulate|carry|overheat/);
    t.advance(MP_RESULT_MS);
    t.host("reset");
    const s = t.roomState("tv");
    expect(s.triedPlans).toEqual([]);
    expect(s.pairs[0]!.locked).toBeNull();
    expect(s.pairs[0]!.lastWave).toBeNull();
  });
});

describe("Act III dials and saved or not (E2b)", () => {
  const near = { greenDeg: 0, redDeg: 0 } as const;
  /** Against `near`, always the opposite direction: only the double-HOT case holds (25%). */
  const far = { greenDeg: 90, redDeg: 90 } as const;

  function toTool(t: ReturnType<typeof setup>) {
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.join("a2", "Cy", "A"); // with CORA
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
  }
  const wave = (t: ReturnType<typeof setup>) => {
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
  };

  it("dials reach the partner live, CORA's are the optimal ones, and they lock at the wave start", () => {
    const t = setup(31);
    toTool(t);
    t.clear("b1");
    t.send("a1", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.A });
    const s = t.roomState("b1");
    expect(s.pairs[0]!.dials).toEqual({ a: OPTIMAL_TUNING.A, b: near });
    expect(s.pairs[1]!.dials.b).toEqual(OPTIMAL_TUNING.B);
    t.host("startBatch");
    t.send("a1", { type: "player:strategy", act: 3, tuning: near });
    expect(t.roomState("tv").pairs[0]!.lockedDials).toEqual({ a: OPTIMAL_TUNING.A, b: near });
  });

  it("the crew's dials average decides saved or not after each wave, and saved stays saved", () => {
    const t = setup(32);
    toTool(t);
    // Pair 1 at 0° against 90° (25%), pair 2 Cy optimal with CORA (≈ 85.4%): average ≈ 55%, not saved.
    t.send("b1", { type: "player:strategy", act: 3, tuning: far });
    t.send("a2", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.A });
    expect(t.roomState("tv")).toMatchObject({ crewDialsRate: null, stationSaved: false });
    wave(t);
    let s = t.roomState("tv");
    const pair1 = quantumExpectedWinRate(near, far);
    expect(s.crewDialsRate).toBeCloseTo((pair1 + QUANTUM_LIMIT) / 2, 10);
    expect(s.stationSaved).toBe(false);
    // Pair 1 tunes optimally: ≈ 85.4% average, saved.
    t.send("a1", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.A });
    t.send("b1", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.B });
    wave(t);
    s = t.roomState("tv");
    expect(s.crewDialsRate).toBeCloseTo(QUANTUM_LIMIT, 10);
    expect(s.stationSaved).toBe(true);
    // Back to 0° against 90°: the average drops, but the station stays saved.
    t.send("a1", { type: "player:strategy", act: 3, tuning: near });
    t.send("b1", { type: "player:strategy", act: 3, tuning: far });
    wave(t);
    s = t.roomState("tv");
    expect(s.crewDialsRate).toBeLessThan(0.8);
    expect(s.stationSaved).toBe(true);
    t.host("reset");
    expect(t.roomState("tv")).toMatchObject({ crewDialsRate: null, stationSaved: false, act3Followed: null });
  });

  it("the crew's followed count adds up the pairs'", () => {
    const t = setup(33);
    toTool(t);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    for (const conn of ["a1", "b1", "a2"]) t.send(conn, { type: "player:valve", roundId: id, valve: t.last(conn, "round:start")!.crystal! });
    t.advance(CORA_DELAY_MS[1]);
    expect(t.roomState("tv").act3Followed).toEqual({ n: 3, of: 3 });
  });
});

describe("crystal plans and the clue ladder (E3c)", () => {
  /** Ada (A) and Bo (B), plus Cy (A) with CORA when `withCora`, at the tool. */
  function toTool(t: ReturnType<typeof setup>, withCora = false) {
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    if (withCora) t.join("a2", "Cy", "A");
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
  }
  const plan = (t: ReturnType<typeof setup>, conn: string, tuning: { greenDeg: number; redDeg: number }) =>
    t.send(conn, { type: "player:strategy", act: 3, tuning });
  /** A wave where every phone follows its crystal straight away. */
  const followWave = (t: ReturnType<typeof setup>, conns: string[]) => {
    t.host("startBatch");
    for (let r = 0; r < MP_WAVE_SIZE; r++) {
      for (const conn of conns) {
        const { roundId, crystal } = t.last(conn, "round:start")!;
        t.send(conn, { type: "player:valve", roundId, valve: crystal! });
      }
      t.advance(CORA_DELAY_MS[1] + MP_RESULT_MS + 1);
    }
    t.advance(MP_RESULT_MS);
  };

  it.each(RULE_GAPS.map((g) => [g]))("measured at round start, the crystals agree as often as the rule says (gap %s°)", (gap) => {
    const t = setup(50 + gap);
    toTool(t);
    plan(t, "a1", { greenDeg: 0, redDeg: 0 });
    plan(t, "b1", { greenDeg: gap, redDeg: gap });
    let same = 0;
    let n = 0;
    for (let w = 0; w < 120; w++) {
      t.host("startBatch");
      for (let r = 0; r < MP_WAVE_SIZE; r++) {
        const a = t.last("a1", "round:start")!;
        const b = t.last("b1", "round:start")!;
        expect(a.roundId).toBe(b.roundId);
        if (a.crystal === b.crystal) same++;
        n++;
        t.send("a1", { type: "player:valve", roundId: a.roundId, valve: a.crystal! });
        t.send("b1", { type: "player:valve", roundId: b.roundId, valve: b.crystal! });
        t.advance(MP_RESULT_MS);
      }
      t.advance(MP_RESULT_MS);
    }
    expect(Math.abs(same / n - matchProbability(0, gap))).toBeLessThan(0.035);
  });

  it("two humans at the starting plan (0°) average exactly 75%; not saved", () => {
    const t = setup(61);
    toTool(t);
    followWave(t, ["a1", "b1"]);
    expect(t.roomState("tv")).toMatchObject({ crewDialsRate: 0.75, stationSaved: false });
  });

  it("a human at 0° with CORA: the pair's rate is the starting line's computed number", () => {
    const t = setup(62);
    toTool(t, true);
    followWave(t, ["a1", "b1", "a2"]);
    const pairs = t.roomState("tv").pairs;
    const cora = pairs[1]!.lockedDials!;
    expect(cora).toEqual({ a: DEFAULT_TUNING, b: coraPlan("B") });
    expect(quantumExpectedWinRate(cora.a, cora.b)).toBeCloseTo(pairRateFor("A", DEFAULT_TUNING, coraPlan("B")), 12);
    expect(t.roomState("tv").crewDialsRate).toBeCloseTo((0.75 + pairRateFor("A", DEFAULT_TUNING, coraPlan("B"))) / 2, 12);
  });

  it("the clue 4 settings average 85.4% and save the station", () => {
    const t = setup(63);
    toTool(t, true);
    plan(t, "a1", CLUE_SETTINGS.A);
    plan(t, "b1", CLUE_SETTINGS.B);
    plan(t, "a2", CLUE_SETTINGS.A);
    followWave(t, ["a1", "b1", "a2"]);
    const s = t.roomState("tv");
    expect(s.crewDialsRate).toBeCloseTo(QUANTUM_LIMIT, 12);
    expect(s.stationSaved).toBe(true);
  });

  it("the clue ladder: 1 with the tool, 2 only after a wave, one step per press, kept on reconnect, 0 on Reset", () => {
    const t = setup(64);
    expect(t.roomState("tv").clue).toBe(0);
    toTool(t);
    expect(t.roomState("tv").clue).toBe(1);
    t.host("nextClue");
    expect(t.last("tv", "error")!.code).toBe("not-now"); // clue 2 needs an Act III wave
    t.host("startBatch");
    t.host("nextClue");
    expect(t.roomState("tv").clue).toBe(1); // not during a wave
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    expect(t.roomState("tv").phase).toBe("batchDone");
    // The TV and a remote press Next clue from the same step: it rises once.
    const { room, remoteKey, token } = t.last("tv", "host:created")!;
    t.send("r1", { type: "remote:pair", room, key: remoteKey });
    const step = t.roomState("tv").step;
    t.send("tv", { type: "host:command", cmd: "nextClue", step });
    t.send("r1", { type: "host:command", cmd: "nextClue", step });
    expect(t.last("r1", "error")!.code).toBe("stale");
    expect(t.roomState("tv").clue).toBe(2);
    t.send("r1", { type: "host:command", cmd: "nextClue", step: t.roomState("r1").step });
    t.host("nextClue");
    expect(t.roomState("tv").clue).toBe(4);
    t.host("nextClue");
    expect(t.last("tv", "error")!.code).toBe("not-now"); // never past 4
    // A reconnecting TV keeps it.
    t.send("tv2", { type: "host:resume", room, token });
    expect(t.roomState("tv2").clue).toBe(4);
    t.send("tv2", { type: "host:command", cmd: "reset" });
    expect(t.roomState("tv2").clue).toBe(0);
  });
});

describe("the ending and the incident report (E3a)", () => {
  function toAct3(t: ReturnType<typeof setup>) {
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
  }
  const wave = (t: ReturnType<typeof setup>) => {
    t.host("startBatch");
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
  };

  it("the storm passes only after an Act III wave, outside a wave; then the incident report", () => {
    const t = setup(41);
    toAct3(t);
    t.host("stormPasses");
    expect(t.last("tv", "error")!.code).toBe("not-now"); // no Act III wave yet
    t.host("startBatch");
    t.host("stormPasses");
    expect(t.roomState("tv").phase).toBe("round"); // not during a wave
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * MP_WAVE_SIZE);
    t.host("stormPasses");
    expect(t.roomState("tv").phase).toBe("resolution");
    t.host("debrief");
    expect(t.roomState("tv")).toMatchObject({ phase: "debrief", debriefStep: 0 });
  });

  it("the report's step moves with Back / Next within its four steps, and a reconnecting TV keeps it", () => {
    const t = setup(42);
    toAct3(t);
    wave(t);
    t.host("reportNext");
    expect(t.last("tv", "error")!.code).toBe("not-now"); // not before the report
    t.host("stormPasses");
    t.host("debrief");
    t.host("reportBack");
    expect(t.roomState("tv").debriefStep).toBe(0);
    for (let i = 0; i < 5; i++) t.host("reportNext");
    expect(t.roomState("tv").debriefStep).toBe(3);
    t.host("reportBack");
    expect(t.roomState("tv").debriefStep).toBe(2);
    const { room, token } = t.last("tv", "host:created")!;
    t.station.disconnect("tv");
    t.send("tv2", { type: "host:resume", room, token });
    expect(t.roomState("tv2").debriefStep).toBe(2);
    t.send("tv2", { type: "host:command", cmd: "reset" });
    expect(t.roomState("tv2")).toMatchObject({ phase: "lobby", debriefStep: 0, savedDialsRate: null });
  });

  it("the average that first saved the station is kept, even when a later wave's drops", () => {
    const t = setup(43);
    toAct3(t);
    t.send("a1", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.A });
    t.send("b1", { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING.B });
    wave(t);
    expect(t.roomState("tv").savedDialsRate).toBeCloseTo(QUANTUM_LIMIT, 10);
    t.send("b1", { type: "player:strategy", act: 3, tuning: { greenDeg: 90, redDeg: 90 } });
    wave(t);
    const s = t.roomState("tv");
    expect(s.crewDialsRate).toBeLessThan(0.8);
    expect(s.savedDialsRate).toBeCloseTo(QUANTUM_LIMIT, 10);
    expect(s.stationSaved).toBe(true);
  });
});

describe("pacing (facilitator-paced event mode)", () => {
  /** Ada and Bo, one pair; the default (manual first waves) unless `speed` is given (auto at that speed). */
  function pair(speed: Speed | null = null, seed = 51) {
    const t = setup(seed, speed);
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    return t;
  }
  const answerBoth = (t: ReturnType<typeof setup>) => {
    const id = t.last("a1", "round:start")!.roundId;
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    t.send("b1", { type: "player:valve", roundId: id, valve: 0 });
  };
  const cmd = (t: ReturnType<typeof setup>, c: Extract<ClientMsg, { type: "host:command" }>) => t.send("tv", c);

  it("manual (each act's first wave by default): no countdown; the round waits for every player, the result for Next", () => {
    const t = pair();
    t.host("startBatch");
    let s = t.roomState("tv");
    expect(s).toMatchObject({ phase: "round", auto: false, autoChosen: false, deadline: null, batchSize: MP_WAVE_SIZE });
    expect(t.last("a1", "round:start")!.deadline).toBeNull();
    t.advance(10 * 60_000);
    expect(t.roomState("tv").phase).toBe("round"); // nobody has chosen; it waits
    answerBoth(t);
    expect(t.roomState("tv")).toMatchObject({ phase: "roundResult", deadline: null });
    t.advance(10 * 60_000);
    expect(t.roomState("tv").phase).toBe("roundResult"); // the result waits for the facilitator
    t.host("next");
    s = t.roomState("tv");
    expect(s).toMatchObject({ phase: "round", roundNo: 2 });
  });

  it("Next in a round closes it: anyone who hasn't chosen counts as too slow", () => {
    const t = pair();
    t.host("startBatch");
    t.send("a1", { type: "player:valve", roundId: t.last("a1", "round:start")!.roundId, valve: 0 });
    t.host("next");
    expect(t.last("a1", "round:result")).toMatchObject({ timedOut: true, a: 0, b: null, cause: "slow" });
  });

  it("Next works in auto too: it skips the rest of the result", () => {
    const t = pair("brisk");
    t.host("startBatch");
    answerBoth(t);
    expect(t.roomState("tv").phase).toBe("roundResult");
    t.host("next");
    expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: 2 });
  });

  it("a repeated command from the same step only advances once", () => {
    const t = pair();
    t.host("startBatch");
    answerBoth(t);
    const step = t.roomState("tv").step;
    cmd(t, { type: "host:command", cmd: "next", step });
    cmd(t, { type: "host:command", cmd: "next", step }); // a double press, or a second controller
    expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: 2 });
    expect(t.last("tv", "error")!.code).toBe("stale");
  });

  it("later waves default to auto at Relaxed, with a countdown on the round and the result", () => {
    const t = pair();
    t.host("startBatch");
    for (let r = 0; r < MP_WAVE_SIZE; r++) {
      answerBoth(t);
      t.host("next");
    }
    expect(t.roomState("tv")).toMatchObject({ phase: "batchDone", auto: false });
    t.host("startBatch");
    let s = t.roomState("tv");
    expect(s).toMatchObject({ auto: true, speed: "relaxed" });
    expect(s.deadline! - s.serverNow).toBe(RELAXED_ROUND_MS);
    t.advance(RELAXED_ROUND_MS);
    s = t.roomState("tv");
    expect(s.phase).toBe("roundResult");
    expect(s.deadline! - s.serverNow).toBe(RELAXED_RESULT_MS);
    t.advance(RELAXED_RESULT_MS);
    expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: 2 });
  });

  it("auto on a waiting result takes effect at once: the result moves on after its time", () => {
    const t = pair();
    t.host("startBatch");
    answerBoth(t);
    t.advance(60_000); // the result has waited a minute in manual
    t.host("auto");
    const s = t.roomState("tv");
    expect(s).toMatchObject({ auto: true, autoChosen: true, phase: "roundResult" });
    expect(s.deadline! - s.serverNow).toBe(RELAXED_RESULT_MS);
    t.advance(RELAXED_RESULT_MS);
    expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: 2 });
    // The round that follows is timed too.
    expect(t.last("a1", "round:start")!.deadline).not.toBeNull();
  });

  it("manual mid-round takes effect at once: the deadline goes, and players can still answer", () => {
    const t = pair("brisk");
    t.host("startBatch");
    t.advance(1000);
    t.host("manual");
    expect(t.roomState("tv")).toMatchObject({ auto: false, deadline: null });
    t.advance(60_000);
    expect(t.roomState("tv").phase).toBe("round");
    answerBoth(t);
    expect(t.roomState("tv").phase).toBe("roundResult");
    t.advance(60_000);
    expect(t.roomState("tv").phase).toBe("roundResult");
  });

  it("a speed change mid-round takes effect at once (the time already spent counts, at least 2 s left)", () => {
    const t = pair("relaxed");
    t.host("startBatch");
    t.advance(1000);
    cmd(t, { type: "host:command", cmd: "setSpeed", speed: "brisk" });
    let s = t.roomState("tv");
    expect(s.speed).toBe("brisk");
    expect(s.deadline! - s.serverNow).toBe(MP_ROUND_MS - 1000);
    t.advance(MP_ROUND_MS - 1000);
    expect(t.roomState("tv").phase).toBe("roundResult");
    // Late in a Relaxed round, switching to Brisk still leaves 2 s.
    t.host("next");
    cmd(t, { type: "host:command", cmd: "setSpeed", speed: "relaxed" });
    t.advance(10_000);
    cmd(t, { type: "host:command", cmd: "setSpeed", speed: "brisk" });
    s = t.roomState("tv");
    expect(s.deadline! - s.serverNow).toBe(2000);
  });

  it("picking a speed in manual switches to auto, starting the full time now", () => {
    const t = pair();
    t.host("startBatch");
    t.advance(30_000);
    cmd(t, { type: "host:command", cmd: "setSpeed", speed: "brisk" });
    const s = t.roomState("tv");
    expect(s).toMatchObject({ auto: true, speed: "brisk" });
    expect(s.deadline! - s.serverNow).toBe(MP_ROUND_MS);
  });

  it("the facilitator's choice holds into the next wave; Reset restores the default", () => {
    const t = pair();
    t.host("startBatch");
    t.host("auto"); // chosen in the first wave
    t.host("manual");
    for (let r = 0; r < MP_WAVE_SIZE; r++) {
      answerBoth(t);
      t.host("next");
    }
    t.host("startBatch"); // a second wave would default to auto; the choice (manual) holds
    expect(t.roomState("tv")).toMatchObject({ auto: false, autoChosen: true, deadline: null });
    t.host("reset");
    expect(t.roomState("tv")).toMatchObject({ auto: false, autoChosen: false, speed: "relaxed" });
  });

  it("Relaxed gives Act I 15 s to decide", () => {
    const t = pair("relaxed");
    t.host("startNightShift");
    t.host("startBatch");
    const s = t.roomState("tv");
    expect(s.deadline! - s.serverNow).toBe(RELAXED_ACT1_ROUND_MS);
  });

  it("the lull never ends by itself; the TV gets the time it began", () => {
    const t = pair();
    t.host("startStrategy");
    const s = t.roomState("tv");
    expect(s).toMatchObject({ phase: "strategy", deadline: null });
    expect(s.lullSince).toBe(s.serverNow);
    t.advance(30 * 60_000);
    expect(t.roomState("tv").phase).toBe("strategy");
    t.host("startBatch");
    expect(t.roomState("tv")).toMatchObject({ phase: "round", lullSince: null });
  });

  it("a player who leaves mid-round is covered by CORA until they rejoin, which gives the seat back", () => {
    const t = pair("brisk");
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    t.send("b1", { type: "player:leave" });
    expect(t.roomState("tv").players.find((p) => p.name === "Bo")!.connected).toBe(false);
    t.advance(CORA_DELAY_MS[1]);
    expect(t.last("a1", "round:result")!.b).not.toBeNull(); // CORA played Bo's seat
    t.advance(MP_RESULT_MS);
    // Round 2: still away, still covered. Bo rejoins before CORA moves: the seat is his again.
    t.join("b1b", "Bo", "B");
    const again = t.last("b1b", "round:start")!;
    expect(again.roundId).toBe("1-2");
    t.advance(CORA_DELAY_MS[1]);
    expect(t.roomState("tv").pairs[0]!.answered.b).toBe(false); // CORA stood down
    t.send("b1b", { type: "player:valve", roundId: again.roundId, valve: 1 });
    expect(t.roomState("tv").pairs[0]!.answered.b).toBe(true);
  });
});

describe("the facilitator's remote (E3b)", () => {
  /** Ada and Bo in a manual first wave, and a remote paired with the TV's key. */
  function withRemote() {
    const t = setup(61, null);
    t.join("a1", "Ada", "A");
    t.join("b1", "Bo", "B");
    const key = t.last("tv", "host:created")!.remoteKey;
    t.send("r1", { type: "remote:pair", room: t.room, key });
    return { t, key };
  }
  const answerBoth = (t: ReturnType<typeof setup>) => {
    const id = t.last("a1", "round:start")!.roundId;
    t.send("a1", { type: "player:valve", roundId: id, valve: 0 });
    t.send("b1", { type: "player:valve", roundId: id, valve: 0 });
  };

  it("pairs with the TV's key, gets the room's state and runs the session", () => {
    const { t } = withRemote();
    expect(t.last("r1", "remote:paired")!.room).toBe(t.room);
    expect(t.roomState("tv").remotes).toBe(1);
    expect(t.roomState("r1").phase).toBe("lobby");
    t.send("r1", { type: "host:command", cmd: "startBatch" });
    expect(t.roomState("tv").phase).toBe("round");
  });

  it("a wrong key is refused, and its commands too", () => {
    const t = setup(62, null);
    t.join("a1", "Ada", "A");
    t.send("r2", { type: "remote:pair", room: t.room, key: "nope" });
    expect(t.last("r2", "error")!.code).toBe("not-host");
    t.send("r2", { type: "host:command", cmd: "startBatch" });
    expect(t.roomState("tv").phase).toBe("lobby");
  });

  it("gets each round's results, to read the causes aloud", () => {
    const { t } = withRemote();
    t.host("startBatch");
    answerBoth(t);
    expect(t.last("r1", "round:results")!.results).toHaveLength(1);
  });

  it("the TV and the remote pressing Next from the same step advance once", () => {
    const { t } = withRemote();
    t.host("startBatch");
    answerBoth(t);
    const step = t.roomState("tv").step;
    t.send("tv", { type: "host:command", cmd: "next", step });
    t.send("r1", { type: "host:command", cmd: "next", step });
    expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: 2 });
    expect(t.last("r1", "error")!.code).toBe("stale");
  });

  it("unpairing (TV only) drops the remote and the old key stops working", () => {
    const { t, key } = withRemote();
    t.send("r1", { type: "host:command", cmd: "unpairRemotes" });
    expect(t.roomState("tv").remotes).toBe(1); // a remote can't unpair
    t.host("unpairRemotes");
    expect(t.roomState("tv").remotes).toBe(0);
    expect(t.last("r1", "error")!.code).toBe("not-host");
    expect(t.last("tv", "host:created")!.remoteKey).not.toBe(key);
    t.send("r1", { type: "host:command", cmd: "startBatch" });
    expect(t.roomState("tv").phase).toBe("lobby");
    t.send("r3", { type: "remote:pair", room: t.room, key });
    expect(t.last("r3", "error")!.code).toBe("not-host");
  });

  it("a remote that disconnects is no longer counted", () => {
    const { t } = withRemote();
    t.station.disconnect("r1");
    expect(t.roomState("tv").remotes).toBe(0);
  });

  it("phones and remotes never receive the remote key or the TV's token", () => {
    const { t, key } = withRemote();
    t.host("startBatch");
    answerBoth(t);
    const token = t.last("tv", "host:created")!.token;
    for (const conn of ["a1", "b1", "r1"]) {
      const sent = JSON.stringify(t.msgs(conn));
      expect(sent).not.toContain(key);
      expect(sent).not.toContain(token);
    }
  });
});
