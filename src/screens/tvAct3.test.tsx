// Event Act III on the TV and the remote (server-rendered, no browser): the explainer, the crystals' rule and the
// clues in the lull (no meter, no hint button), Next clue in the shared host steps (TV and remote, labelled with the
// clue it releases, never before an Act III wave for clue 2), "Plans locked" in Acts II and III, the wave done's gaps,
// "found it" and luck lines, and event copy that never says "dials" while solo's keys stay as they were.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../config.ts";
import { useHost } from "../net/hostStore.ts";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { enabledSteps, stepLabel } from "./hostSteps.tsx";
import { remoteSteps, talkingPoints } from "./Remote.tsx";
import { CrystalWave, Screen } from "./Screen.tsx";

Object.assign(globalThis, { location: { origin: "http://localhost:8787", hostname: "localhost" } });
const esc = (text: string) => text.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

function tv(state: RoomState) {
  Object.assign(useHost.getInitialState(), { state, status: "open", localDeadline: null, results: null, error: null });
  return renderToString(<Screen />);
}

function act3(phase: RoomState["phase"], clue = 1, waves = 0): RoomState {
  const s = room(phase, false, 3);
  s.toolUnlocked = s.ceilingRevealed = true;
  s.clue = clue;
  s.stability.act3 = { rounds: waves * 8, wins: waves * 6, timeouts: 0 };
  if (waves) s.pairs[0] = { ...s.pairs[0]!, lockedDials: { a: DEFAULT_TUNING, b: DEFAULT_TUNING } };
  return s;
}

describe("the TV in Act III", () => {
  it("the lull: the explainer, the crystals' rule and the clue; no meter, no hint button", () => {
    const markup = tv(act3("strategy"));
    expect(markup).toContain(esc(S.event.explain.strategy.question));
    expect(markup).toContain(esc(S.event.crystalRule.head));
    expect(markup).toContain("<td>85%</td>");
    expect(markup).toContain(esc(S.event.clues.question));
    expect(markup).not.toContain("Show hint");
    expect(markup).toMatch(/<div class="panel" hidden="">[^]*?Station stability/); // the meter steps aside
  });

  it("clue 2 on the TV: each pair's weakest case from its locked plans", () => {
    const markup = tv(act3("strategy", 2, 1));
    expect(markup).toContain(esc(S.event.clues.weakest("A HOT · B HOT", "0°", "0%", "differ")));
  });

  it("a wave: the explainer and Plans locked; Act II waves are stamped too", () => {
    const wave3 = tv(act3("round"));
    expect(wave3).toContain(esc(S.event.explain.round.question));
    expect(wave3).toContain(S.event.locked.tvStamp);
    expect(tv(room("round", false, 2))).toContain(S.event.locked.tvStamp);
    expect(tv(room("round", false, 1))).not.toContain(S.event.locked.tvStamp); // the night shift has no plans
  });

  it("after a wave: each case's gap, found it, and the luck line both ways", () => {
    const s = act3("batchDone", 1, 1);
    s.pairs.push({
      ...s.pairs[0]!,
      id: 2,
      lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B },
      lastWave: { rounds: 8, wins: 5, timeouts: 0 }, // 62.5%: under 80% by bad luck
    });
    s.pairs[0] = { ...s.pairs[0]!, lastWave: { rounds: 8, wins: 7, timeouts: 0 } }; // 87.5% at a 75% plan: luck
    const markup = renderToString(<CrystalWave state={s} />);
    expect(markup).toContain(S.event.wave3.gap("22.5°"));
    expect(markup).toContain(">85%<");
    expect(markup).toContain(S.event.wave3.gap("67.5°"));
    expect(markup.split(S.event.wave3.foundIt)).toHaveLength(2);
    expect(markup).toContain(esc(S.event.wave3.luckyAbove("75.0%")));
    expect(markup).toContain(esc(S.event.wave3.luckyBelow("85.4%")));
    expect(markup).toContain(esc(S.event.explain.batchDone.question));
  });
});

describe("clue 2 after a wave", () => {
  it("marks each pair's weakest case with what it needs (both HOT at 0°: wider)", () => {
    const s = act3("batchDone", 2, 1);
    s.pairs[0] = { ...s.pairs[0]!, lastWave: { rounds: 8, wins: 6, timeouts: 0 } };
    const markup = renderToString(<CrystalWave state={s} />);
    expect(markup.match(/case--weakest/g)).toHaveLength(1);
    expect(markup).toContain(S.event.wave3.needWider);
    expect(renderToString(<CrystalWave state={{ ...s, clue: 1 }} />)).not.toContain("case--weakest");
  });
});

describe("Next clue (TV and remote, shared steps)", () => {
  it("offered with the tool only once an Act III wave has run; labelled with the clue it releases; none after 4", () => {
    expect(enabledSteps(act3("tool"))).not.toContain("nextClue");
    const after = act3("batchDone", 1, 1);
    expect(enabledSteps(after)).toContain("nextClue");
    expect(stepLabel(after, "nextClue")).toBe(S.tv.nextClue(2));
    expect(enabledSteps(act3("strategy", 3, 1))).toContain("nextClue");
    expect(enabledSteps(act3("strategy", 4, 1))).not.toContain("nextClue");
    expect(enabledSteps(act3("round", 2, 1))).not.toContain("nextClue");
    expect(tv(after)).toContain(`>${S.tv.nextClue(2)}</button>`);
    expect(remoteSteps(act3("strategy", 2, 1))).toEqual(["startBatch", "nextClue"]);
  });

  it("the remote's talking points: the phase's first, then the latest clue's, in Act III", () => {
    const points = talkingPoints(act3("strategy", 3, 1));
    expect(points).toEqual([S.remote.talk.act3Strategy[0], ...S.remote.talk.clue[2]!]);
    expect(talkingPoints(act3("round", 3, 1))).toEqual(S.remote.talk.round);
  });
});

describe("event copy", () => {
  /** Every string (and string-returning function, called with sample args) under a key. */
  const texts = (v: unknown): string[] =>
    typeof v === "string"
      ? [v]
      : typeof v === "function"
        ? [String((v as (...a: unknown[]) => unknown)("x", "y", "z", "w", "v", "u", "t"))]
        : v && typeof v === "object"
          ? Object.values(v).flatMap(texts)
          : [];

  it("never says dials or tuning (crystal plans and settings)", () => {
    const event = [S.event, S.tv, S.remote, S.phone].flatMap(texts).join("\n");
    expect(event).not.toMatch(/\bdials?\b/i);
    expect(event).not.toMatch(/\btun(e|ing)\b/i);
  });
});
