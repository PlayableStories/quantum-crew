// Lines that connect the game to a talk on quantum (E3f): the crystals as entangled coins at the tool reveal (TV and
// phones), perfect agreement scoring only 75% in the first Act III lull (computed), who tested the inequality and
// "no messages, but a shared key" in the incident report (event and solo share the wording), and the remote's points.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CLASSICAL_LIMIT, DIAL_POSITIONS } from "../shared/chsh.ts";
import { planRate } from "../shared/crystalPlan.ts";
import type { RoomState } from "../shared/protocol.ts";
import { useHost } from "../net/hostStore.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { clueTalk, talkingPoints } from "./Remote.tsx";
import { Screen, TvDebrief } from "./Screen.tsx";

Object.assign(globalThis, { location: { origin: "http://localhost:8787", hostname: "localhost" } });
const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const coins = S.event.pod.lines[2]!;

function tv(state: RoomState) {
  Object.assign(useHost.getInitialState(), { state, status: "open", localDeadline: null, results: null, error: null });
  return renderToString(<Screen />);
}

function act3(phase: RoomState["phase"], clue: number, waves = 0): RoomState {
  const s = room(phase, false, 3);
  s.toolUnlocked = s.ceilingRevealed = true;
  s.clue = clue;
  s.stability.act3 = { rounds: waves * 8, wins: waves * 6, timeouts: 0 };
  return s;
}

beforeEach(() => put({ round: null, flash: null }));

describe("the tool reveal: the crystals as entangled coins", () => {
  it("comes right after engineering's note, on the TV and the phones", () => {
    expect(coins).toMatch(/^Think of them as entangled coins/);
    expect(S.event.pod.lines[1]).toMatch(/^Engineering's note/);
    expect(tv(act3("tool", 0))).toContain(esc(coins));
    seat(act3("tool", 0));
    expect(renderToString(<Play />)).toContain(esc(coins));
  });
});

describe("the first Act III lull: perfect agreement scores only what a plan does", () => {
  it("the same setting for COOL and HOT at both tables scores exactly the classical limit, for every setting", () => {
    for (const d of DIAL_POSITIONS) {
      const same = { greenDeg: d, redDeg: d };
      expect(planRate(same, same)).toBeCloseTo(CLASSICAL_LIMIT, 12);
    }
  });

  it("shows on the TV before the first Act III wave, with the computed 75%; gone after a wave", () => {
    const line = S.event.explain.strategy.firstSame("75%");
    expect(tv(act3("strategy", 1))).toContain(esc(line));
    expect(tv(act3("strategy", 1, 1))).not.toContain(esc(line));
    expect(tv(room("strategy", false, 2))).not.toContain(esc(line)); // not Act II's lull
  });
});

describe("the incident report: who tested it, and no messages but a shared key", () => {
  const report = (step: number): RoomState => ({ ...room("debrief", false, 3), debriefStep: step });

  it("step 1 names Clauser, Aspect and Zeilinger; step 3 explains shared randomness and key distribution", () => {
    const one = renderToString(<TvDebrief state={report(0)} onCommand={() => {}} />);
    expect(one).toContain(esc(S.event.report.steps[0]!.body[2]!));
    expect(S.event.report.steps[0]!.body[2]).toBe(S.debrief.steps[0]!.body[2]); // the same line in solo
    const three = renderToString(<TvDebrief state={report(2)} onCommand={() => {}} />);
    expect(three).toContain(esc(S.event.report.steps[2]!.body[2]!));
    expect(S.event.report.steps[2]!.body[2]).toBe(S.debrief.steps[2]!.body[2]);
    expect(S.event.report.steps[2]!.body[2]).toMatch(/shared randomness, not a message/);
  });
});

describe("the remote's talking points", () => {
  it("the tool reveal: entangled coins; the first lull: why 75%; the no-signalling step: a shared key", () => {
    expect(talkingPoints(act3("tool", 0))).toContain(S.remote.talk.toolCoins);
    const first = talkingPoints(act3("strategy", 1));
    expect(first[0]).toBe(S.remote.talk.firstLull("75%"));
    expect(clueTalk().sameRate).toBe("75%");
    expect(talkingPoints(act3("strategy", 1, 1))).not.toContain(S.remote.talk.firstLull("75%"));
    expect(talkingPoints({ ...room("debrief", false, 3), debriefStep: 2 })).toEqual([S.remote.talk.noSignal]);
    expect(talkingPoints({ ...room("debrief", false, 3), debriefStep: 1 })).not.toContain(S.remote.talk.noSignal);
  });
});
