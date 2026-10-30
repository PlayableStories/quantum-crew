// Story Phase 2 (server-rendered, no browser): storm waves counted across Acts II and III, the supply pod, CORA on how
// the player used the crystal, the resolution (only after the gate or the last wave) and the incident report.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ACT3_ROUND_MS, BATCH_SIZE } from "../config.ts";
import { OPTIMAL_TUNING, scoreRound, winRate } from "../shared/chsh.ts";
import { pct } from "../components/StabilityMeter.tsx";
import { CLOCKWISE } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { followLine } from "./crew.ts";
import { Solo } from "./Solo.tsx";
import { dialsRate, soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const esc = (text: string) => text.replace(/'/g, "&#x27;");
soloStore.getInitialState = soloStore.getState;

function playBatch(act: () => void = () => {}) {
  let now = 0;
  s().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
    act();
    now += ACT3_ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

function toTuning() {
  toHuddle(s);
  playBatch();
  s().reportCeiling();
  s().revealTool();
  s().openTool();
}

beforeEach(() => s().reset());

describe("storm waves", () => {
  it("the lull, the wave, the readout and tuning count waves across Acts II and III", () => {
    toHuddle(s);
    expect(html()).toContain(S.plan.lockSub(1));
    expect(html()).toContain(S.plan.title);
    s().beginBatch();
    s().advance(0);
    const wave = html();
    expect(wave).toContain(`>${S.batch.label(1)}<`);
    expect(wave).toContain(S.comms.dark);
    playBatch();
    expect(html()).toContain(S.readout.kicker(1));
    s().reportCeiling();
    expect(html()).toContain(S.ceiling.kicker);
    s().revealTool();
    expect(html()).toContain(S.pod.kicker);
    s().openTool();
    expect(html()).toContain(S.tuning.start(2)); // Act III's first wave is the storm's second
  });

  it("event mode's own keys are untouched by solo's (event mode counts storm waves too, since E1)", () => {
    expect(S.tool.kicker).toBe("Incoming cargo");
    expect(S.tool.lines[1]).toContain("The crystal decides your pump");
    expect(S.debrief.kicker).toBe("Debrief");
    expect(S.tv.roundOf(2, 3, 12)).toBe("Wave 2 · round 3/12");
    expect(S.tv.phase.batchDone).toBe("The wave has passed");
  });
});

describe("CORA on the crystal (Act III readout)", () => {
  const r = scoreRound(0, 0, CLOCKWISE, CLOCKWISE);
  const slow = scoreRound(0, 0, null, CLOCKWISE);

  it("notices going your own way (more than 3 rounds against), following every round, and stays quiet otherwise", () => {
    const batch = Array.from({ length: 12 }, () => r);
    expect(followLine({ batch, batchFollowed: batch.map((_, i) => i >= 4) })).toEqual([S.crew.readout.ownWay]);
    expect(followLine({ batch, batchFollowed: batch.map(() => true) })).toEqual([S.crew.readout.followedAll]);
    expect(followLine({ batch, batchFollowed: batch.map((_, i) => i >= 2) })).toEqual([]);
  });

  it("a timeout isn't going your own way", () => {
    const batch = Array.from({ length: 12 }, () => slow);
    expect(followLine({ batch, batchFollowed: batch.map(() => false) })).toEqual([]);
  });
});

describe("the resolution", () => {
  it("doesn't appear after a wave whose dials didn't pass", () => {
    toTuning(); // default dials, about 67.7%
    playBatch();
    s().startDebrief();
    expect(s().phase).toBe("act3Readout");
  });

  it("appears when the gate passes, and leads to the incident report", () => {
    toTuning();
    s().setDial(0, OPTIMAL_TUNING.A.greenDeg);
    s().setDial(1, OPTIMAL_TUNING.A.redDeg);
    playBatch();
    expect(html()).toContain(`>${S.readout.debrief}</button>`);
    s().startDebrief();
    expect(s().phase).toBe("resolution");
    const markup = html();
    expect(markup).toContain(S.resolution.title);
    expect(markup).toContain(esc(S.crew.resolution));
    expect(markup).toContain(`>${S.resolution.go}</button>`);
    s().openReport();
    expect(s().phase).toBe("debrief");
  });

  it("appears after the final Act III wave even if the dials never passed", () => {
    toTuning();
    playBatch();
    s().nextBatch();
    playBatch();
    s().startDebrief();
    expect(s().phase).toBe("resolution");
  });

  it("the incident report isn't reachable any other way", () => {
    toHuddle(s);
    s().openReport();
    expect(s().phase).toBe("act2Plan");
  });
});

describe("the incident report", () => {
  it("first step: Act I with the radio (your score), Act II's best plan (75%), Act III's crystals (your dials)", () => {
    toTuning();
    s().setDial(0, OPTIMAL_TUNING.A.greenDeg);
    s().setDial(1, OPTIMAL_TUNING.A.redDeg);
    playBatch();
    s().startDebrief();
    s().openReport();
    const markup = html();
    expect(markup).toContain(S.report.kicker);
    expect(markup).toContain(S.report.act1Yours(pct(winRate(s().act1))));
    expect(markup).toContain(">100%<");
    expect(markup).toContain(">75%<");
    expect(markup).toContain(`>${pct(dialsRate(s()))}<`);
    expect(markup).toContain(S.report.story);
  });

  it("the no-signalling step says why the storm couldn't jam the crystals", () => {
    toTuning();
    playBatch();
    s().nextBatch();
    playBatch();
    s().startDebrief();
    s().openReport();
    s().setDebriefStep(2);
    expect(html()).toContain(esc(S.report.noJam));
  });
});
