import { describe, expect, it } from "vitest";
import { BATCH_SIZE, ROUND_MS } from "../config.ts";
import { scoreRound, type Bit } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { COMMS_DARK_PHASES, act2Reactions, crewLines, nextIdea } from "./crew.ts";
import { planOf } from "./plans.ts";
import { createSoloStore, type Phase } from "./soloStore.ts";

type Store = ReturnType<typeof createSoloStore>;

/** Plays a batch round by round, collecting what the crewmate would say at every step. */
function playBatchListening(store: Store, act: (s: Store) => void): string[] {
  const heard: string[] = [];
  const listen = () => heard.push(...crewLines(store.getState()));
  let now = 0;
  store.getState().beginBatch();
  listen();
  for (let i = 0; i < BATCH_SIZE; i++) {
    store.getState().advance(now);
    listen();
    act(store);
    listen();
    now += ROUND_MS + 1;
    store.getState().timeout(now);
    listen();
  }
  store.getState().advance(now);
  return heard;
}

const ALL_PHASES: Phase[] = [
  "intro",
  "act2Plan",
  "act2Batch",
  "act2Readout",
  "ceiling",
  "toolReveal",
  "act3Plan",
  "act3Batch",
  "act3Readout",
  "debrief",
];

describe("comms rule", () => {
  it("the crewmate says nothing in a batch phase, whatever else the state holds", () => {
    const store = createSoloStore(11);
    const base = store.getState();
    for (const phase of COMMS_DARK_PHASES) {
      for (const crewCue of ["opening", "agreeCrew", "agreePlayer", "idea"] as const) {
        expect(crewLines({ ...base, phase, crewCue })).toEqual([]);
      }
    }
  });

  it("speaks only while comms are open", () => {
    const store = createSoloStore(11);
    const base = store.getState();
    const speaks = new Set<Phase>(["act2Plan", "act2Readout", "ceiling", "toolReveal", "act3Plan", "act3Readout"]);
    for (const phase of ALL_PHASES) {
      expect(crewLines({ ...base, phase }).length > 0, phase).toBe(speaks.has(phase));
    }
  });

  it("stays silent through every step of live batches in both acts", () => {
    const store = createSoloStore(21);
    const s = () => store.getState();
    s().start();
    const heard2 = playBatchListening(store, (st) => st.getState().answer(CLOCKWISE, 0));
    expect(s().phase).toBe("act2Readout");
    expect(crewLines(s()).length).toBeGreaterThan(0); // comms back on at the readout
    s().reportCeiling();
    s().revealTool();
    s().openTool();
    const heard3 = playBatchListening(store, (st) => st.getState().measure(0));
    expect(s().phase).toBe("act3Readout");
    expect([...heard2, ...heard3]).toEqual([]);
  });
});

describe("huddle lines", () => {
  it("opens with standard procedure, then agrees to whatever the player proposes", () => {
    const store = createSoloStore(2);
    const s = () => store.getState();
    s().start();
    expect(crewLines(s())).toEqual([S.crew.opening]);
    s().choosePlan("crew", planOf(1));
    expect(crewLines(s())).toEqual([S.crew.agreeCrew[1]]);
    s().choosePlan("player", planOf(3));
    expect(crewLines(s())).toEqual([S.crew.agreePlayer[3]]);
  });

  it("offers an idea when the player comes back to the huddle with the same plan", () => {
    const store = createSoloStore(4);
    const s = () => store.getState();
    s().start();
    playBatchListening(store, () => {});
    s().nextBatch();
    expect(s().crewCue).toBe("idea");
    expect(crewLines(s())).toEqual([S.crew.idea[1]]); // the next idea after standard: reverse when HOT
  });

  it("ideas skip tested pairs and run out when the board is full", () => {
    const board = Object.fromEntries(
      [0, 1, 2, 3].flatMap((p) => [0, 1, 2, 3].map((c) => [`${p}-${c}`, { rate: 0.75, by: "player" as const }])),
    );
    expect(nextIdea({ plan: planOf(0), crewPlan: planOf(0), board })).toBeNull();
    const { ["0-1"]: _, ...missingOne } = board;
    expect(nextIdea({ plan: planOf(0), crewPlan: planOf(0), board: missingOne })).toBe(1);
  });
});

describe("readout reactions", () => {
  const r = (x: Bit, y: Bit, a: Bit | null, b: Bit | null) => scoreRound(x, y, a, b);

  it("picks the most telling loss by round number, deterministically", () => {
    const batch = [
      r(COOL, COOL, CLOCKWISE, CLOCKWISE),
      r(HOT, COOL, ANTICLOCKWISE, CLOCKWISE), // round 2: crewmate cool, player reversed → spike
      r(HOT, HOT, CLOCKWISE, ANTICLOCKWISE), // round 3: purge
      r(HOT, HOT, CLOCKWISE, CLOCKWISE), // round 4: overheat (ranked first)
    ];
    expect(act2Reactions(batch)).toEqual([S.crew.readout.overheat(4), S.crew.readout.purge(3)]);
    expect(act2Reactions(batch)).toEqual(act2Reactions(batch));
    expect(act2Reactions(batch.slice(0, 2))).toEqual([S.crew.readout.hotCool(2)]);
  });

  it("calls out timeouts and perfect batches", () => {
    expect(act2Reactions([r(COOL, HOT, null, CLOCKWISE)])).toEqual([S.crew.readout.timeout(1)]);
    expect(act2Reactions([r(COOL, COOL, CLOCKWISE, CLOCKWISE)])).toEqual([S.crew.readout.perfect]);
  });
});

describe("station telemetry", () => {
  it("says in one impersonal sentence why the round held or failed", () => {
    const why = S.telemetry.why;
    expect(why(scoreRound(HOT, HOT, CLOCKWISE, CLOCKWISE))).toBe(
      "Both sections HOT and the pumps matched, so nothing pushed the heat out of the open vent.",
    );
    expect(why(scoreRound(HOT, HOT, ANTICLOCKWISE, CLOCKWISE))).toBe(
      "Both sections HOT and the pumps fought, so the vent opened and purged the heat.",
    );
    expect(why(scoreRound(HOT, COOL, ANTICLOCKWISE, CLOCKWISE))).toBe(
      "The pumps fought, but the vent stays locked unless both sections are HOT.",
    );
    expect(why(scoreRound(COOL, HOT, CLOCKWISE, CLOCKWISE))).toBe(
      "One section HOT and the pumps matched, so the heat was carried to the cool side.",
    );
    expect(why(scoreRound(COOL, COOL, ANTICLOCKWISE, ANTICLOCKWISE))).toBe(
      "Both sections COOL and the pumps matched, so the coolant circulated.",
    );
    expect(why(scoreRound(COOL, HOT, null, CLOCKWISE))).toBe("Your pump wasn't set in time.");
  });
});
