// Event Act III on the TV and the remote (server-rendered, no browser): the explainer, the crystals' rule and the
// clues in the lull (no meter, no hint button), Next clue in the shared host steps (TV and remote, labelled with the
// clue it releases, never before an Act III wave for clue 2), "Plans locked" in Acts II and III, the wave done's gaps,
// "found it" and luck lines, and event copy that never says "dials" while solo's keys stay as they were.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../config.ts";
import { DIAL_POSITIONS } from "../shared/chsh.ts";
import { planCases } from "../shared/crystalPlan.ts";
import { useHost } from "../net/hostStore.ts";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { enabledSteps, stepLabel } from "./hostSteps.tsx";
import { clueTalk, remoteSteps, talkingPoints } from "./Remote.tsx";
import { CrystalWave, Screen } from "./Screen.tsx";
import { answerOutText, answerText } from "../components/CrystalPlan.tsx";

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
    expect(markup).toContain(esc(S.event.crystalRule.coin));
    expect(markup).toContain(esc(S.event.crystalRule.follow));
    expect(markup).not.toContain("Show hint");
    expect(markup).toMatch(/<div class="panel" hidden="">[^]*?Station stability/); // the meter steps aside
  });

  it("the tool reveal: the three rule lines and the table", () => {
    const markup = tv(act3("tool"));
    for (const t of [S.event.crystalRule.coin, S.event.crystalRule.closer, S.event.crystalRule.follow])
      expect(markup).toContain(esc(t));
    expect(markup).toContain("<td>15%</td>");
    expect(markup).toContain(esc(S.event.explain.tool.question));
  });

  it("the tool reveal: the rule only, no clue panel; no Next clue", () => {
    const markup = tv(act3("tool", 0));
    expect(markup).not.toContain("clues__titles");
    expect(markup).not.toContain(esc(S.event.clues.nudge));
    expect(enabledSteps(act3("tool", 0))).not.toContain("nextClue");
  });

  it("clue 1 in the lull: every pair's live hint (or found it) with its live rate, and the nudge", () => {
    const s = act3("strategy", 1);
    s.pairs.push({ ...s.pairs[0]!, id: 2, dials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } });
    const markup = tv(s);
    expect(markup).toContain(esc(S.event.clues.pairRate(1, "75%")));
    expect(markup).toContain(esc(S.event.clues.listHint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(markup).toContain(esc(S.event.clues.pairRate(2, "85.4%")));
    expect(markup).toContain(S.event.clues.foundIt("80%"));
    expect(markup).toContain(esc(S.event.clues.nudge));
  });

  it("with CORA the TV's hint names the player and their own setting", () => {
    const s = act3("strategy", 1);
    s.pairs[0] = { ...s.pairs[0]!, b: { playerId: null, name: "CORA" }, dials: { a: DEFAULT_TUNING, b: OPTIMAL_TUNING.B } };
    const markup = tv(s);
    expect(markup).toMatch(/Ada, (bring|move) your (COOL|HOT) setting/);
  });

  it("clue 2 in the lull: the answer and its fan", () => {
    const markup = tv(act3("strategy", 2, 1));
    expect(markup).toContain(esc(answerText()));
    expect(markup).toContain('class="fan"');
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

describe("after a wave: clue 1's hint, then the answer", () => {
  it("clue 1: each pair below 80% gets its weakest case outlined and which way to move", () => {
    const s = act3("batchDone", 1, 1);
    s.pairs[0] = { ...s.pairs[0]!, lastWave: { rounds: 8, wins: 6, timeouts: 0 } };
    const markup = renderToString(<CrystalWave state={s} />);
    expect(markup.match(/case--weakest/g)).toHaveLength(1);
    expect(markup).toContain(esc(S.event.clues.tvHint("A HOT · B HOT", "differ")));
  });

  it("clue 2: the answer in one line, no per-pair hint", () => {
    const markup = renderToString(<CrystalWave state={act3("batchDone", 2, 1)} />);
    expect(markup).toContain(esc(answerOutText()));
    expect(markup).not.toContain("tv__pair-hint");
    expect(markup).not.toContain("case--weakest");
  });

  it("a pair at 80%+ gets found it and no hint", () => {
    const s = act3("batchDone", 1, 1);
    s.pairs[0] = { ...s.pairs[0]!, lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } };
    const markup = renderToString(<CrystalWave state={s} />);
    expect(markup).toContain(S.event.wave3.foundIt);
    expect(markup).not.toContain("tv__pair-hint");
  });
});

describe("clue 3 holds", () => {
  it("for every combination of the eight settings, the differ gap is at most the three match gaps added together", () => {
    for (const ag of DIAL_POSITIONS)
      for (const ar of DIAL_POSITIONS)
        for (const bg of DIAL_POSITIONS)
          for (const br of DIAL_POSITIONS) {
            const cases = planCases({ greenDeg: ag, redDeg: ar }, { greenDeg: bg, redDeg: br });
            const match = cases.filter((c) => c.need === "same").reduce((t, c) => t + c.gap, 0);
            const differ = cases.find((c) => c.need === "differ")!.gap;
            expect(differ).toBeLessThanOrEqual(match + 1e-9);
          }
  });
});

describe("Next clue: the answer (TV and remote, shared steps)", () => {
  it("only after clue 1 and an Act III wave; never in a wave or past 2; labelled with the pairs not yet at 80%", () => {
    expect(enabledSteps(act3("strategy", 1, 0))).not.toContain("nextClue"); // no wave yet
    const after = act3("batchDone", 1, 1);
    expect(enabledSteps(after)).toContain("nextClue");
    expect(stepLabel(after, "nextClue")).toBe(S.tv.nextClue(1, "80%"));
    expect(S.tv.nextClue(2, "80%")).toBe("Next clue: the answer (2 pairs not yet at 80%)");
    const mixed = act3("batchDone", 1, 1);
    mixed.pairs.push({ ...mixed.pairs[0]!, id: 2, dials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } });
    mixed.pairs.push({ ...mixed.pairs[0]!, id: 3 });
    expect(stepLabel(mixed, "nextClue")).toBe(S.tv.nextClue(2, "80%"));
    expect(enabledSteps(act3("strategy", 1, 1))).toContain("nextClue");
    expect(enabledSteps(act3("strategy", 2, 1))).not.toContain("nextClue");
    expect(enabledSteps(act3("round", 1, 1))).not.toContain("nextClue");
    expect(tv(after)).toContain(`>${S.tv.nextClue(1, "80%")}</button>`);
    expect(remoteSteps(act3("strategy", 1, 1))).toEqual(["startBatch", "nextClue"]);
  });

  it("the remote's talking points: the rule at the tool; clue 1 in the lull and after a wave; the answer at clue 2", () => {
    const k = clueTalk();
    expect(talkingPoints(act3("tool", 0))).toEqual([S.remote.talk.tool[0], S.remote.talk.toolCoins, ...S.remote.talk.rule(k)]);
    // The first lull (no wave yet): why perfect agreement only scores 75% (E3f), then clue 1.
    // R1: every lull adds the ready count after its first point.
    const ready = S.remote.talk.ready(0, act3("strategy", 1, 0).pairs.length);
    expect(talkingPoints(act3("strategy", 1, 0))).toEqual([S.remote.talk.firstLull(k.sameRate), ready, ...S.remote.talk.clue(1, k)]);
    expect(talkingPoints(act3("strategy", 1, 1))).toEqual([S.remote.talk.act3Strategy[0], ready, ...S.remote.talk.clue(1, k)]);
    expect(talkingPoints(act3("batchDone", 1, 1))).toEqual([S.remote.talk.act3BatchDone[0], ...S.remote.talk.clue(1, k, true)]);
    expect(talkingPoints(act3("strategy", 2, 1)).join(" ")).toContain("85.4%");
    expect(talkingPoints(act3("round", 2, 1))).toEqual(S.remote.talk.round);
    expect(S.remote.talk.clue(3, k)).toEqual([]); // the old clue 3 and 4 points are gone
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
