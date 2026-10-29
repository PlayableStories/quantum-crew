import { describe, expect, it } from "vitest";
import { ACT2_BATCHES, BATCH_SIZE, DEBRIEF_AFTER_BATCHES, HINT_AFTER_FAILED_BATCHES, ROUND_MS, ACT3_ROUND_MS } from "../config.ts";
import { CLOSED, OPEN, OPTIMAL_TUNING, classicalExpectedWinRate, winRate } from "../shared/chsh.ts";
import { canReportCeiling, createSoloStore, debriefAvailable, dialsRate, displayedStability, hintAvailable } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

type Store = ReturnType<typeof createSoloStore>;

/** Plays one full batch. `act` decides what the player does each round (or nothing, to time out). */
function playBatch(store: Store, act: (s: Store) => void) {
  let now = 0;
  store.getState().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    store.getState().advance(now);
    act(store);
    now += ACT3_ROUND_MS + 1;
    store.getState().timeout(now);
  }
  store.getState().advance(now); // ends the batch
}

const followPlan = (s: Store) => {
  const { round, plan } = s.getState();
  s.getState().answer(round!.x === 0 ? plan.onGreen : plan.onRed, 0);
};

describe("solo flow", () => {
  it("runs intro → Act II batches → ceiling → tool → Act III → debrief", () => {
    const store = createSoloStore(42);
    const s = () => store.getState();
    expect(s().phase).toBe("intro");
    toHuddle(s);
    expect(s().phase).toBe("act2Plan");

    for (let b = 0; b < ACT2_BATCHES; b++) {
      expect(canReportCeiling(s())).toBe(false);
      playBatch(store, followPlan);
      expect(s().phase).toBe("act2Readout");
      expect(s().batch).toHaveLength(BATCH_SIZE);
      if (b < ACT2_BATCHES - 1) s().nextBatch();
    }
    expect(s().act2).toHaveLength(ACT2_BATCHES * BATCH_SIZE);
    expect(canReportCeiling(s())).toBe(true);

    s().reportCeiling();
    s().revealTool();
    s().openTool();
    expect(s().phase).toBe("act3Plan");
    expect(debriefAvailable(s())).toBe(false);

    s().setDial(0, OPTIMAL_TUNING.A.greenDeg);
    s().setDial(1, OPTIMAL_TUNING.A.redDeg);
    playBatch(store, (st) => {
      st.getState().measure(0);
      st.getState().followCrystal(0);
    });
    expect(s().phase).toBe("act3Readout");
    expect(s().act3).toHaveLength(BATCH_SIZE);

    // The optimal dials pass the gate whatever the batch scored.
    expect(dialsRate(s())).toBeGreaterThan(0.8);
    expect(displayedStability(s())).toBe(winRate(s().act3));
    expect(debriefAvailable(s())).toBe(true);
    s().startDebrief();
    s().openReport(); // the resolution, then the incident report
    expect(s().phase).toBe("debrief");
  });

  it("Act II has no sampled test, and no plan's exact rate beats 75%", () => {
    const store = createSoloStore(7);
    const s = () => store.getState();
    toHuddle(s);
    playBatch(store, followPlan);
    for (const [g, r] of [
      [OPEN, OPEN],
      [OPEN, CLOSED],
      [CLOSED, OPEN],
      [CLOSED, CLOSED],
    ] as const) {
      s().setPlan(0, g);
      s().setPlan(1, r);
      expect(classicalExpectedWinRate(s().plan, s().crewPlan)).toBeLessThanOrEqual(0.75);
    }
  });

  it("a timeout is a loss and the crewmate still answers", () => {
    const store = createSoloStore(1);
    toHuddle(() => store.getState());
    playBatch(store, () => {});
    const { batch } = store.getState();
    expect(batch.every((r) => r.timedOut && !r.win && r.a === null && r.b !== null)).toBe(true);
  });

  it("ignores answers after the deadline and answers twice", () => {
    const store = createSoloStore(3);
    const s = () => store.getState();
    toHuddle(s);
    s().beginBatch();
    s().advance(0);
    s().answer(OPEN, ROUND_MS + 1);
    expect(s().round!.result).toBeNull();
    s().answer(CLOSED, 10);
    s().answer(OPEN, 20);
    expect(s().batch).toHaveLength(1);
    expect(s().round!.result!.a).toBe(CLOSED);
  });

  it("unlocks the hint after failed Act III batches and the debrief after enough batches", () => {
    const store = createSoloStore(5);
    const s = () => store.getState();
    toHuddle(s);
    for (let b = 0; b < ACT2_BATCHES; b++) {
      playBatch(store, followPlan);
      s().nextBatch();
    }
    playBatch(store, followPlan);
    s().reportCeiling();
    s().revealTool();
    s().openTool();
    for (let b = 0; b < DEBRIEF_AFTER_BATCHES; b++) {
      expect(hintAvailable(s())).toBe(b >= HINT_AFTER_FAILED_BATCHES);
      playBatch(store, () => {}); // timeouts: every batch fails
      s().nextBatch();
    }
    expect(hintAvailable(s())).toBe(true);
    s().showHint();
    expect(s().hintShown).toBe(true);
    expect(debriefAvailable(s())).toBe(true);
  });
});
