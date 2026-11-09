// Who hears what (A1): solo and the TV carry the game's sound; a phone only its own player's tap, win and lost.
import { describe, expect, it } from "vitest";
import { ATLAS_ASSETS } from "../assets/atlas/list.ts";
import { PHONE_CUES, phoneCues, roundCue, tvResultCues, tvStateCues, type TvMemory } from "./cues.ts";

const state = (phase: string, over: Partial<{ stationSaved: boolean; rolling: number | null; lastBatch: { wins: number; rounds: number } | null }> = {}) => ({
  phase,
  stationSaved: over.stationSaved ?? false,
  stability: { rolling: over.rolling ?? null },
  lastBatch: over.lastBatch ?? null,
});

describe("solo and a phone's round result", () => {
  it("held = win, lost (including too slow) = lost", () => {
    expect(roundCue({ win: true })).toBe("win");
    expect(roundCue({ win: false })).toBe("lost");
  });
});

describe("the phone: only its own action and consequence", () => {
  it("a new result flash plays win or lost once; the same flash again plays nothing", () => {
    expect(phoneCues(null, { roundId: "1-1", win: true })).toEqual(["win"]);
    expect(phoneCues("1-1", { roundId: "1-2", win: false })).toEqual(["lost"]);
    expect(phoneCues("1-2", { roundId: "1-2", win: false })).toEqual([]);
    expect(phoneCues("1-2", null)).toEqual([]);
  });

  it("the phone's cues are only tap, win and lost: never the room's storm, reveal, saved or alarm", () => {
    expect([...PHONE_CUES].sort()).toEqual(["lost", "tap", "win"]);
    for (const room of ["storm", "reveal", "saved", "alarm"]) expect(PHONE_CUES).not.toContain(room);
  });
});

describe("the TV: the room's sounds", () => {
  it("win when at least half the pairs held a round, once per round", () => {
    const mem: TvMemory = { rolling: null };
    expect(tvResultCues(mem, { roundId: "1-1", results: [{ win: true }, { win: false }] })).toEqual(["win"]);
    expect(tvResultCues(mem, { roundId: "1-1", results: [{ win: true }, { win: false }] })).toEqual([]);
    expect(tvResultCues(mem, { roundId: "1-2", results: [{ win: true }, { win: false }, { win: false }] })).toEqual([]);
  });

  it("the alarm when the gauge crosses below 80% or a wave ends under it", () => {
    const mem: TvMemory = { rolling: null };
    tvStateCues(mem, state("round", { rolling: 0.85 }));
    expect(tvStateCues(mem, state("round", { rolling: 0.78 }))).toEqual(["alarm"]);
    expect(tvStateCues(mem, state("round", { rolling: 0.7 }))).toEqual([]); // already below
    expect(tvStateCues(mem, state("batchDone", { rolling: 0.7, lastBatch: { wins: 5, rounds: 8 } }))).toEqual(["alarm"]);
  });

  it("the storm, the tool and the station saved, once each on entering the phase", () => {
    const mem: TvMemory = { rolling: null };
    expect(tvStateCues(mem, state("storm"))).toEqual(["storm"]);
    expect(tvStateCues(mem, state("storm"))).toEqual([]);
    expect(tvStateCues(mem, state("tool"))).toEqual(["reveal"]);
    expect(tvStateCues(mem, state("resolution", { stationSaved: true }))).toEqual(["saved"]);
    const notSaved: TvMemory = { rolling: null, phase: "batchDone" };
    expect(tvStateCues(notSaved, state("resolution", { stationSaved: false }))).toEqual([]);
  });
});

describe("every sound has an Atlas slot", () => {
  it("sfx-tap, win, lost, alarm, storm, reveal and saved are listed (the stand-in plays until a file is added)", () => {
    const keys = ATLAS_ASSETS.map((a) => a.key);
    for (const name of ["tap", "win", "lost", "alarm", "storm", "reveal", "saved"]) expect(keys).toContain(`sfx-${name}`);
  });
});
