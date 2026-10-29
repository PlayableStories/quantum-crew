// Act III flow (Phase 3): the crystal suggests, the player sets the pump; exact rates everywhere (four cases,
// no-signalling); the debrief gate is the dials' exact rate, not the batch's score.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ACT3_ROUND_MS, BATCH_SIZE, ROUND_MS } from "../config.ts";
import {
  DIAL_POSITIONS,
  OPTIMAL_TUNING,
  exactOpenRates,
  matchProbability,
  quantumCases,
  quantumExpectedWinRate,
  type Valve,
} from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { createSoloStore, debriefAvailable, dialsRate, followedCount, hintAvailable, soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

type Store = ReturnType<typeof createSoloStore>;
const esc = (text: string) => text.replace(/'/g, "&#x27;");

/** Plays one batch; `act` runs once per live round. */
function playBatch(store: Store, act: (s: Store) => void = () => {}) {
  let now = 0;
  store.getState().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    store.getState().advance(now);
    act(store);
    now += ACT3_ROUND_MS + 1;
    store.getState().timeout(now);
  }
  store.getState().advance(now);
}

function toTuning(store: Store) {
  const s = () => store.getState();
  toHuddle(s);
  playBatch(store);
  s().reportCeiling();
  s().revealTool();
  s().openTool();
}

describe("exact helpers", () => {
  const settings = DIAL_POSITIONS.flatMap((g) => DIAL_POSITIONS.map((r) => ({ greenDeg: g, redDeg: r })));

  it("the four crystal cases average to quantumExpectedWinRate, for every dial setting", () => {
    for (const t of settings) {
      const cases = quantumCases(t, OPTIMAL_TUNING.B);
      expect(cases).toHaveLength(4);
      const mean = cases.reduce((sum, c) => sum + c.pWin, 0) / 4;
      expect(mean).toBeCloseTo(quantumExpectedWinRate(t, OPTIMAL_TUNING.B), 12);
      const hotHot = cases.find((c) => c.x === 1 && c.y === 1)!;
      expect(hotHot.pWin).toBeCloseTo(1 - matchProbability(hotHot.thetaA, hotHot.thetaB), 12);
    }
  });

  it("each pump's clockwise rate is exactly 50% whatever the partner's sensor, for every dial setting", () => {
    for (const t of settings) {
      const r = exactOpenRates(t, OPTIMAL_TUNING.B);
      for (const v of [r.a.partnerGreen, r.a.partnerRed, r.b.partnerGreen, r.b.partnerRed]) expect(v).toBeCloseTo(0.5, 12);
    }
  });
});

describe("the crystal is a suggestion", () => {
  it("MEASURE reads both crystals; the player's pump is scored, CORA follows hers, following is recorded", () => {
    const store = createSoloStore(31);
    const s = () => store.getState();
    toTuning(store);
    s().beginBatch();
    s().advance(0);
    expect(s().round!.deadline).toBe(ACT3_ROUND_MS); // 7 s in Act III
    s().answer(0, 0); // no pump before MEASURE
    expect(s().round!.result).toBeNull();
    s().measure(0);
    const { crystal, crewPump } = s().round!;
    expect(crystal).not.toBeNull();
    expect(crewPump).not.toBeNull();
    const against = (1 - crystal!) as Valve;
    s().answer(against, 0);
    expect(s().round!.result).toMatchObject({ a: against, b: crewPump });
    expect(s().batchFollowed).toEqual([false]);
    s().advance(1);
    s().measure(1);
    s().followCrystal(1);
    expect(s().round!.result!.a).toBe(s().round!.crystal);
    expect(s().batchFollowed).toEqual([false, true]);
    expect(followedCount(s())).toBe(1);
  });

  it("Act II keeps its 5 s rounds", () => {
    const store = createSoloStore(32);
    toHuddle(() => store.getState());
    store.getState().beginBatch();
    store.getState().advance(0);
    expect(store.getState().round!.deadline).toBe(ROUND_MS);
  });
});

describe("the debrief gate", () => {
  const gate = (greenDeg: number, redDeg: number) => {
    const store = createSoloStore(33);
    const s = () => store.getState();
    toTuning(store);
    s().setDial(0, greenDeg);
    s().setDial(1, redDeg);
    playBatch(store); // every round times out: the batch scores 0%
    return s();
  };

  it("passes at about 80.2% (0° / 22.5°) and at the best dials, whatever the batch scored", () => {
    const near = gate(0, 22.5);
    expect(dialsRate(near)).toBeCloseTo(0.802, 3);
    expect(near.batch.every((r) => !r.win)).toBe(true);
    expect(debriefAvailable(near)).toBe(true);
    expect(hintAvailable(near)).toBe(false);
    expect(debriefAvailable(gate(OPTIMAL_TUNING.A.greenDeg, OPTIMAL_TUNING.A.redDeg))).toBe(true);
  });

  it("doesn't pass at the default 0° / 0° (about 67.7%): batch 2 with the hint, then the debrief opens anyway", () => {
    const store = createSoloStore(34);
    const s = () => store.getState();
    toTuning(store);
    playBatch(store, (st) => (st.getState().measure(0), st.getState().followCrystal(0)));
    expect(dialsRate(s())).toBeCloseTo(0.677, 3);
    expect(debriefAvailable(s())).toBe(false);
    expect(hintAvailable(s())).toBe(true);
    s().nextBatch();
    playBatch(store);
    expect(debriefAvailable(s())).toBe(true);
  });
});

describe("Act III screens", () => {
  const s = () => soloStore.getState();
  const html = () => renderToString(<Solo />);
  soloStore.getInitialState = soloStore.getState;
  beforeEach(() => s().reset());

  it("first tuning explains the tool; later visits keep it behind a button", () => {
    toTuning(soloStore);
    expect(html()).toContain(esc(S.tuning.explain));
    playBatch(soloStore);
    s().nextBatch();
    const later = html();
    expect(later).not.toContain(esc(S.tuning.explain));
    expect(later).toContain(`>${S.tuning.explainHead}</button>`);
  });

  it("the round: MEASURE first, then 'Crystal says' with the suggested pump tagged", () => {
    toTuning(soloStore);
    s().beginBatch();
    s().advance(0);
    expect(html()).toMatch(/class="btn measure"/);
    expect(html()).not.toContain("pumpbtn");
    s().measure(0);
    const markup = html();
    expect(markup).toContain(S.batch.crystalSays(S.pump[s().round!.crystal!]));
    expect(markup).toContain("pumpbtn--suggested");
    expect(markup).toContain(`>${S.batch.crystalTag}</span>`);
  });

  it("the readout: followed N of 12, the crystal cases, and the luck line when an unlucky batch had good dials", () => {
    toTuning(soloStore);
    s().setDial(0, OPTIMAL_TUNING.A.greenDeg);
    s().setDial(1, OPTIMAL_TUNING.A.redDeg);
    playBatch(soloStore); // timeouts: 0%, but the dials' true rate is 85.4%
    const markup = html();
    expect(markup).toContain(S.readout.followed(0, BATCH_SIZE));
    expect(markup).toContain(S.readout.crystalCases);
    expect(markup).toContain(esc(S.readout.luck("below", 3, `${(dialsRate(s()) * 100).toFixed(1)}%`)));
    expect(markup).not.toMatch(/1,000/);
  });

  it("the debrief: best plan beside the crystals, and exact 50% clockwise rates", () => {
    toTuning(soloStore);
    s().setDial(0, OPTIMAL_TUNING.A.greenDeg);
    s().setDial(1, OPTIMAL_TUNING.A.redDeg);
    playBatch(soloStore);
    s().startDebrief();
    s().setDebriefStep(1);
    const step2 = html();
    expect(step2).toContain(S.debrief.compare.plan);
    expect(step2).toContain(S.debrief.compare.dials(true));
    expect(step2).toContain(S.debrief.compare.why);
    expect(step2).toContain("✗ 0%");
    s().setDebriefStep(2);
    const step3 = html();
    expect(step3).toContain(esc(S.debrief.panel.head));
    expect(step3.match(/50\.0%/g)!.length).toBeGreaterThanOrEqual(4);
    expect(step3).not.toMatch(/10,000/);
  });
});
