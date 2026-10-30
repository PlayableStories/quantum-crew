// Saved or not (server-rendered, no browser): the station is saved only when an Act III wave passed the gate (dials at
// an exact ≥ 80%). The ending and the incident report follow it, and the storm shows on the art until the resolution.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { StationVisual } from "../components/StationVisual.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { ACT3_ROUND_MS, BATCH_SIZE } from "../config.ts";
import { OPTIMAL_TUNING, quantumExpectedWinRate } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { soloStore, stationRate, stationSaved } from "./soloStore.ts";
import { playAct1, toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const esc = (text: string) => text.replace(/'/g, "&#x27;");
soloStore.getInitialState = soloStore.getState;

function playBatch() {
  let now = 0;
  s().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
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

/** Plays Act III with these dials until the debrief opens, then opens the resolution. */
function finish(cool: number, hot: number) {
  toTuning();
  s().setDial(COOL, cool);
  s().setDial(HOT, hot);
  playBatch();
  if (s().act3Passed) return s().startDebrief();
  s().nextBatch();
  playBatch(); // the final Act III wave
  s().startDebrief();
}

beforeEach(() => s().reset());

describe("stationSaved", () => {
  it("saved at about 80.2% (0° / 22.5°) and at the best dials, whatever the waves scored", () => {
    finish(0, 22.5);
    expect(stationRate(s())).toBeCloseTo(0.802, 3);
    expect(stationSaved(s())).toBe(true);
    s().reset();
    finish(OPTIMAL_TUNING.A.greenDeg, OPTIMAL_TUNING.A.redDeg);
    expect(stationSaved(s())).toBe(true);
  });

  it("not saved at the default 0° / 0° (about 67.7%), even though the debrief opens after the final wave", () => {
    finish(0, 0);
    expect(s().phase).toBe("resolution");
    expect(stationRate(s())).toBeCloseTo(0.677, 3);
    expect(stationSaved(s())).toBe(false);
  });

  it("the report keeps the dials that saved the station after a retune", () => {
    toTuning();
    s().setDial(HOT, 45);
    playBatch(); // passes at 0° / 45°
    s().nextBatch();
    s().setDial(HOT, 0); // retuned to 0° / 0°
    playBatch();
    expect(stationSaved(s())).toBe(true);
    expect(stationRate(s())).toBeCloseTo(quantumExpectedWinRate(OPTIMAL_TUNING.A, OPTIMAL_TUNING.B), 12);
  });
});

describe("the ending", () => {
  it("saved: the core is steady, CORA's in-step line, the calm art clearing", () => {
    finish(0, 45);
    const markup = html();
    expect(markup).toContain(S.resolution.log);
    expect(markup).toContain(esc(S.crew.resolution));
    expect(markup).toContain("station__clearing");
    expect(markup).not.toContain("station--damaged");
    expect(markup).not.toContain("station--storm");
    expect(markup).toContain(`>${S.resolution.go}</button>`);
  });

  it("not saved: emergency measures, the damaged art, CORA's own line", () => {
    finish(0, 0);
    const markup = html();
    expect(markup).toContain(esc(S.resolution.logNotSaved));
    expect(markup).toContain(esc(S.crew.resolutionNotSaved));
    expect(markup).toContain("station--damaged");
    expect(markup).not.toContain("station--storm");
    expect(markup).not.toContain(S.resolution.log);
    expect(markup).toContain(`>${S.resolution.go}</button>`);
  });
});

describe("the incident report", () => {
  it("saved: your dials' rate and the crystals beat every plan", () => {
    finish(0, 45);
    s().openReport();
    const markup = html();
    expect(markup).toContain(`>${pct(stationRate(s()))}<`);
    expect(markup).toContain(S.report.story);
    s().setDebriefStep(1);
    expect(html()).toContain(`>${S.debrief.compare.dials(true)}<b`);
  });

  it("not saved: the best dials lead, yours underneath, and no claim that your crystals beat the plans", () => {
    finish(0, 0);
    s().openReport();
    const markup = html();
    expect(markup).toContain(`>${pct(quantumExpectedWinRate(OPTIMAL_TUNING.A, OPTIMAL_TUNING.B))}<`);
    expect(markup).toContain(S.report.act3Yours(pct(stationRate(s()))));
    expect(markup).toContain(esc(S.report.storyNotSaved));
    expect(markup).not.toContain(S.report.story);
    s().setDebriefStep(1);
    const step2 = html();
    expect(step2).toContain(S.debrief.compare.dials(false));
    expect(step2).not.toContain(`>${S.debrief.compare.dials(true)}<b`); // the comparison column's heading
  });
});

describe("the storm on the station art", () => {
  it("the storm screens and the readouts show it; the intro and Act I stay calm", () => {
    expect(html()).not.toContain("station--storm"); // intro
    playAct1(s);
    expect(html()).toContain("station--storm"); // the storm's radio step
    s().endStorm();
    playBatch();
    expect(s().phase).toBe("act2Readout");
    expect(html()).toContain("station--storm");
  });

  it("is off by default (the event TV and the landing are unchanged)", () => {
    const markup = renderToString(<StationVisual rate={0.7} />);
    expect(markup).not.toMatch(/station--storm|station__flare|station__static|station__clearing|station--damaged/);
    expect(renderToString(<StationVisual rate={0.9} storm />)).toContain("station__flare");
  });
});
