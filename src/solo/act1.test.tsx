// Act I (the night shift, radio working) and the storm. The order covers every sensor combination with a purge that
// isn't first; CORA turns at random and calls it; the rule with her reading and pump wins every round; the storm leads
// to the huddle.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ACT1_ROUND_MS, ACT1_ROUNDS } from "../config.ts";
import { mulberry32 } from "../shared/rng.ts";
import { ANTICLOCKWISE, CLOCKWISE, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { act1Order } from "./act1.ts";
import { crewLines } from "./crew.ts";
import { Solo } from "./Solo.tsx";
import { createSoloStore, displayedStability, soloStore } from "./soloStore.ts";
import { playAct1, rulePump } from "./testkit.ts";

const esc = (text: string) => text.replace(/'/g, "&#x27;");

describe("Act I order", () => {
  it("over many seeds: 6 rounds, every combination, a both-HOT round that's never first", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const order = act1Order(mulberry32(seed));
      expect(order).toHaveLength(ACT1_ROUNDS);
      const seen = new Set(order.map(([x, y]) => `${x}${y}`));
      expect(seen).toEqual(new Set(["00", "01", "10", "11"]));
      expect(order[0]).not.toEqual([HOT, HOT]);
    }
  });

  it("follows the seed", () => {
    expect(act1Order(mulberry32(7))).toEqual(act1Order(mulberry32(7)));
  });
});

describe("Act I in the store", () => {
  it("CORA's pump is the one she called, and the rule with her reading and pump wins all six", () => {
    const store = createSoloStore(41);
    const s = () => store.getState();
    playAct1(s);
    expect(s().phase).toBe("storm");
    expect(s().act1).toHaveLength(ACT1_ROUNDS);
    expect(s().act1.map((r) => r.b)).toEqual(s().act1Crew);
    expect(s().act1.every((r) => r.win)).toBe(true);
    expect(s().act1.some((r) => r.x === HOT && r.y === HOT && r.a !== r.b)).toBe(true); // the purge
    expect(s().act1.map((r) => [r.x, r.y])).toEqual(s().act1Order.map(([x, y]) => [x, y]));
  });

  it("CORA turns at random, round by round: both directions across seeds, the same for the same seed", () => {
    const pumps = (seed: number) => {
      const store = createSoloStore(seed);
      store.getState().start();
      return store.getState().act1Crew;
    };
    expect(pumps(5)).toEqual(pumps(5));
    const all = Array.from({ length: 50 }, (_, i) => pumps(i + 1)).flat();
    expect(all).toContain(CLOCKWISE);
    expect(all).toContain(ANTICLOCKWISE);
    expect(all).toHaveLength(50 * ACT1_ROUNDS);
  });

  it("a mistake or a timeout is a lost round; rounds last 8 seconds", () => {
    const store = createSoloStore(42);
    const s = () => store.getState();
    let first = true;
    playAct1(s, (x, y, crew, now) => {
      if (first) {
        expect(s().round!.deadline).toBe(now + ACT1_ROUND_MS);
        s().answer((1 - rulePump(x, y, crew)) as 0 | 1, now); // the wrong pump
        first = false;
      }
      // every other round: no answer (timeout)
    });
    expect(s().act1.filter((r) => r.win)).toHaveLength(0);
    expect(s().act1[0]!.timedOut).toBe(false);
    expect(s().act1.slice(1).every((r) => r.timedOut)).toBe(true);
  });

  it("the storm comes after the last round and leads to the first huddle", () => {
    const store = createSoloStore(43);
    const s = () => store.getState();
    s().endStorm(); // nothing from the intro
    expect(s().phase).toBe("intro");
    playAct1(s);
    expect(s().phase).toBe("storm");
    s().endStorm();
    expect(s().phase).toBe("act2Plan");
    expect(s().act1).toHaveLength(ACT1_ROUNDS); // kept for the debrief
  });

  it("CORA opens before the first round, then calls her reading and her pump each round", () => {
    const store = createSoloStore(44);
    const s = () => store.getState();
    s().start();
    expect(crewLines(s())).toEqual([S.crew.act1Opening]);
    s().advance(0);
    // Her reading and which way she's turning: the pump she actually sets this round.
    const r = s().round!;
    expect(crewLines(s())).toEqual([S.crew.reading(r.y, r.crewPump!)]);
    expect(crewLines(s())[0]).toMatch(/Turning (anti)?clockwise\.$/);
    s().answer(rulePump(r.x, r.y, r.crewPump!), 0);
    expect(s().round!.result!.b).toBe(r.crewPump);
    expect(displayedStability(s())).toBe(1);
  });
});

describe("Act I and the storm on screen", () => {
  const s = () => soloStore.getState();
  const html = () => renderToString(<Solo />);
  soloStore.getInitialState = soloStore.getState;
  beforeEach(() => s().reset());

  it("a live Act I round: CORA's reading on the radio, the rule line, the gauge, no comms-dark panel", () => {
    s().start();
    s().advance(0);
    const markup = html();
    expect(markup).toContain(S.crew.reading(s().round!.y, s().round!.crewPump!));
    expect(markup).toContain("radio-line");
    expect(markup).toContain(esc(S.act1.ruleLine));
    expect(markup).toContain('role="meter"');
    expect(markup).not.toContain("comms-dark");
    expect(markup).toContain(S.act1.round(1));
    expect(markup).toContain("pumpbtn");
    expect(markup).not.toContain("pumpbtn__plan");
  });

  it("the storm: CORA's line breaks up under static, then the station log leads to the huddle", () => {
    playAct1(s);
    const markup = html();
    expect(markup).toContain(esc(S.crew.stormBreak));
    expect(markup).toContain("radio-line--interference");
    expect(markup).toContain(`>${S.storm.next}<`);
  });
});
