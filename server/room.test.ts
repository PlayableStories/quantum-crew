import { describe, expect, it } from "vitest";
import {
  ACT1_ROUNDS,
  ACT1_SETTLE_MS,
  BATCH_SIZE,
  MP_ACT1_RESULT_MS,
  MP_ACT1_ROUND_MS,
  MP_ACT3_ROUND_MS,
  MP_RESULT_MS,
  MP_ROUND_MS,
  ROLLING_WINDOW,
  STORM_STATIC_MS,
  STRATEGY_MS,
} from "../src/config.ts";
import type { ClientMsg, RoomState, ServerMsg } from "../src/shared/protocol.ts";
import { OPTIMAL_TUNING, QUANTUM_LIMIT, quantumExpectedWinRate } from "../src/shared/chsh.ts";
import { mulberry32 } from "../src/shared/rng.ts";
import { BOT_NAME } from "./room.ts";
import { createStation } from "./station.ts";

/** A station with a fake clock and timers, recording every message per connection. */
function setup(seed = 1) {
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
    t.advance(STRATEGY_MS); // the huddle ends and the batch starts by itself
    for (let r = 1; r <= BATCH_SIZE; r++) {
      expect(t.roomState("tv")).toMatchObject({ phase: "round", roundNo: r });
      for (const conn of ["a1", "b1", "a2"]) {
        const start = t.last(conn, "round:start")!;
        expect(start.roundId).toBe(`1-${r}`);
        expect(Object.keys(start).sort()).toEqual(["act", "deadline", "light", "roundId", "serverNow", "type"]);
        // Everyone always OPENs; round:start never carries anyone else's light.
        t.send(conn, { type: "player:valve", roundId: start.roundId, valve: 0 });
      }
      // All answered: resolved at once, without waiting for the deadline.
      expect(t.roomState("tv").phase).toBe("roundResult");
      expect(t.last("tv", "round:results")!.results).toHaveLength(2);
      expect(t.last("a1", "round:result")!.pairId).toBe(1);
      t.advance(MP_RESULT_MS);
    }
    const s = t.roomState("tv");
    expect(s.phase).toBe("batchDone");
    expect(s.lastBatch!.rounds).toBe(2 * BATCH_SIZE);
    expect(s.stability.act2.rounds).toBe(2 * BATCH_SIZE);
    expect(s.pairs[0]!.act2.rounds).toBe(BATCH_SIZE);
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
    for (let b = 0; b < 5; b++) {
      t.host("startBatch");
      t.advance((MP_ROUND_MS + MP_RESULT_MS) * BATCH_SIZE);
    }
    const s = t.roomState("tv");
    expect(s.stability.act2.rounds).toBe(5 * BATCH_SIZE);
    expect(s.stability.rolling).toBe(0); // Ada never answered
    expect(s.batchNo).toBe(5);
    expect(5 * BATCH_SIZE).toBeGreaterThan(ROLLING_WINDOW);
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
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * BATCH_SIZE);
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
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * BATCH_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
    for (const [conn, , table] of seats) t.send(conn, { type: "player:strategy", act: 3, tuning: OPTIMAL_TUNING[table] });
    return { t, conns: seats.map((s) => s[0]) };
  }

  /** Plays `batches` batches; `order` picks which phones tap MEASURE first in each round. Each phone then sets the
   *  pump its crystal suggested (`follow`), or the other one. */
  function play(
    t: ReturnType<typeof setup>,
    conns: readonly string[],
    batches: number,
    order: (round: number) => string[],
    follow: (conn: string) => boolean = () => true,
  ) {
    for (let b = 0; b < batches; b++) {
      t.host("startBatch");
      for (let r = 0; r < BATCH_SIZE; r++) {
        const measuring = order(r).filter((c) => conns.includes(c));
        for (const conn of measuring) t.send(conn, { type: "player:measure", roundId: t.last(conn, "round:start")!.roundId });
        for (const conn of measuring) {
          const { roundId, crystal } = t.last(conn, "round:measured")!;
          t.send(conn, { type: "player:valve", roundId, valve: (follow(conn) ? crystal : 1 - crystal) as 0 | 1 });
        }
        t.advance(MP_RESULT_MS + 1);
      }
      t.advance(MP_RESULT_MS);
    }
  }

  it("unlocks the tool into Act III; a pump before MEASURE is ignored", () => {
    const { t } = act3Room(1);
    expect(t.roomState("tv")).toMatchObject({ phase: "tool", act: 3, toolUnlocked: true });
    t.host("startBatch");
    const start = t.last("a1", "round:start")!;
    expect(start).toMatchObject({ act: 3, dialDeg: OPTIMAL_TUNING.A[start.light === 0 ? "greenDeg" : "redDeg"] });
    t.send("a1", { type: "player:valve", roundId: start.roundId, valve: 0 });
    expect(t.roomState("tv").pairs[0]!.answered.a).toBe(false);
  });

  it("MEASURE sends the crystal only to the phone that measured, and sets no pump", () => {
    const { t } = act3Room(2);
    t.host("startBatch");
    t.clear("b1");
    t.send("a1", { type: "player:measure", roundId: t.last("a1", "round:start")!.roundId });
    expect([0, 1]).toContain(t.last("a1", "round:measured")!.crystal);
    expect(t.last("b1", "round:measured")).toBeUndefined();
    expect(t.roomState("tv").pairs[0]!.answered.a).toBe(false);
  });

  it("the pump set is what scores, even against the crystal; followed counts only players' answered pumps", () => {
    const { t } = act3Room(6);
    t.host("startBatch");
    const id = t.last("a1", "round:start")!.roundId;
    for (const conn of ["a1", "b1"]) t.send(conn, { type: "player:measure", roundId: id });
    const crystalA = t.last("a1", "round:measured")!.crystal;
    const crystalB = t.last("b1", "round:measured")!.crystal;
    t.send("a1", { type: "player:valve", roundId: id, valve: (1 - crystalA) as 0 | 1 }); // Ada goes her own way
    t.send("b1", { type: "player:valve", roundId: id, valve: crystalB });
    t.advance(MP_ACT3_ROUND_MS); // pair 2 and Ed time out
    const result = t.last("a1", "round:result")!;
    expect(result.a).toBe(1 - crystalA);
    expect(result.b).toBe(crystalB);
    const s = t.roomState("tv");
    expect(s.pairs[0]!.followed).toEqual({ n: 1, of: 2 });
    expect(s.pairs[1]!.followed).toEqual({ n: 0, of: 0 }); // timeouts aren't counted
    expect(s.pairs[2]!.followed).toEqual({ n: 0, of: 0 }); // CORA isn't counted
  });

  it("CORA in an empty seat measures at the start and follows her crystal", () => {
    const { t, conns } = act3Room(7);
    t.clear("a3"); // drop the Act II wave's results
    play(t, conns, 1, () => [...conns]);
    const results = t.msgs("a3").filter((m) => m.type === "round:result");
    expect(results).toHaveLength(BATCH_SIZE);
    expect(results.every((m) => m.type === "round:result" && m.b !== null)).toBe(true);
  });

  it.each([
    ["A first", () => ["a1", "a2", "a3", "b1", "b2"]],
    ["B first", () => ["b1", "b2", "a1", "a2", "a3"]],
    ["alternating", (r: number) => (r % 2 ? ["a1", "a2", "a3", "b1", "b2"] : ["b2", "b1", "a3", "a2", "a1"])],
  ])("optimal dials beat the classical limit, whoever measures first (%s)", (_, order) => {
    const { t, conns } = act3Room(3);
    play(t, conns, 80, order);
    const { act3 } = t.roomState("tv").stability;
    expect(act3.rounds).toBe(80 * BATCH_SIZE * 3);
    expect(act3.timeouts).toBe(0);
    expect(Math.abs(act3.wins / act3.rounds - QUANTUM_LIMIT)).toBeLessThan(0.025);
  });

  it("no-signalling: every seat's OPEN rate is ≈ 50% whatever its partner saw (debrief only)", () => {
    const { t, conns } = act3Room(4);
    play(t, conns, 80, (r) => (r % 2 ? ["a1", "a2", "a3", "b1", "b2"] : ["b1", "b2", "a1", "a2", "a3"]));
    expect(t.roomState("tv").marginals).toBeNull();
    t.host("debrief");
    const { rows, crew } = t.roomState("tv").marginals!;
    expect(crew.rounds).toBe(6 * 80 * BATCH_SIZE);
    expect(Math.abs(crew.partnerGreen! - 0.5)).toBeLessThan(0.03);
    expect(Math.abs(crew.partnerRed! - 0.5)).toBeLessThan(0.03);
    expect(rows.map((r) => r.name).sort()).toEqual(["Ada", "Bo", `${BOT_NAME} (pair 3)`, "Cy", "Di", "Ed"].sort());
    for (const row of rows) {
      expect(row.rounds).toBe(80 * BATCH_SIZE);
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
    t.advance(MP_ACT3_ROUND_MS - 1);
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
    t.advance(STRATEGY_MS);
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
      expect(start.partner!.pump).not.toBeNull();
      pumps.push(start.partner!.pump!);
      t.send("a1", { type: "player:valve", roundId: start.roundId, valve: byRule(start.light, start.partner as { light: 0 | 1; pump: 0 | 1 }) });
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
    for (let r = 1; r <= BATCH_SIZE; r++) t.advance(MP_ROUND_MS + MP_RESULT_MS);
    const done = t.roomState("tv");
    expect(done.phase).toBe("batchDone");
    expect(done.pairs[0]!.lastWave).toEqual({ rounds: BATCH_SIZE, wins: 0, timeouts: BATCH_SIZE });
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
    t.advance((MP_ROUND_MS + MP_RESULT_MS) * BATCH_SIZE);
    t.host("revealCeiling");
    t.host("unlockTool");
  }
  const wave = (t: ReturnType<typeof setup>) => {
    t.host("startBatch");
    t.advance((MP_ACT3_ROUND_MS + MP_RESULT_MS) * BATCH_SIZE);
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
    for (const conn of ["a1", "b1", "a2"]) t.send(conn, { type: "player:measure", roundId: id });
    for (const conn of ["a1", "b1", "a2"]) t.send(conn, { type: "player:valve", roundId: id, valve: t.last(conn, "round:measured")!.crystal });
    expect(t.roomState("tv").act3Followed).toEqual({ n: 3, of: 3 });
  });
});
