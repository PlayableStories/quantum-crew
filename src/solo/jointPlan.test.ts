import { describe, expect, it } from "vitest";
import { BATCH_SIZE, ROUND_MS } from "../config.ts";
import { ANTICLOCKWISE, CLOCKWISE } from "../shared/fiction.ts";
import { ALL_CELLS, cellKey, expectedBoard, planOf } from "./plans.ts";
import { createSoloStore, playerTested } from "./soloStore.ts";

type Store = ReturnType<typeof createSoloStore>;

function playBatch(store: Store, act: (s: Store) => void) {
  let now = 0;
  store.getState().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    store.getState().advance(now);
    act(store);
    now += ROUND_MS + 1;
    store.getState().timeout(now);
  }
  store.getState().advance(now);
}

describe("joint plan", () => {
  it("the crewmate plays whatever plan the player set for them", () => {
    const store = createSoloStore(9);
    const s = () => store.getState();
    s().start();
    s().choosePlan("crew", planOf(3)); // always anticlockwise
    playBatch(store, (st) => st.getState().answer(CLOCKWISE, 0));
    expect(s().batch.every((r) => r.b === ANTICLOCKWISE)).toBe(true);
    // Reverse when HOT: the crewmate's pump follows their own sensor.
    s().nextBatch();
    s().choosePlan("crew", planOf(1));
    playBatch(store, () => {}); // the crewmate still answers on a timeout
    expect(s().batch.every((r) => r.b === (r.y === 1 ? ANTICLOCKWISE : CLOCKWISE))).toBe(true);
  });

  it("tests the joint plan from the huddle and records it on the board", () => {
    const store = createSoloStore(10);
    const s = () => store.getState();
    s().start();
    s().choosePlan("player", planOf(1));
    s().choosePlan("crew", planOf(2));
    s().runSimulation();
    const cell = s().board[cellKey(planOf(1), planOf(2))];
    expect(cell?.by).toBe("player");
    expect(cell!.rate).toBeCloseTo(expectedBoard()["1-2"], 1);
    expect(s().lastSim!.winRate).toBe(cell!.rate);
    expect(s().phase).toBe("act2Plan"); // no live play
  });

  it("keeps a tested cell when the plan changes, and the readout test records the cell too", () => {
    const store = createSoloStore(12);
    const s = () => store.getState();
    s().start();
    s().runSimulation(); // 0-0
    s().choosePlan("crew", planOf(3));
    expect(s().board["0-0"]).toBeDefined();
    expect(s().board["0-3"]).toBeUndefined();
    playBatch(store, () => {});
    s().runSimulation(); // at the readout: 0-3
    expect(Object.keys(s().board).sort()).toEqual(["0-0", "0-3"]);
  });

  it("no tested cell beats 75%", () => {
    const store = createSoloStore(13);
    const s = () => store.getState();
    s().start();
    for (const p of [0, 1, 2, 3] as const)
      for (const c of [0, 1, 2, 3] as const) {
        s().choosePlan("player", planOf(p));
        s().choosePlan("crew", planOf(c));
        s().runSimulation();
      }
    for (const k of ALL_CELLS) expect(s().board[k]!.rate).toBeLessThan(0.8);
  });
});

describe("engineering report", () => {
  it("fills exactly the untested cells, marks them as engineering's, and keeps the player's", () => {
    const store = createSoloStore(14);
    const s = () => store.getState();
    s().start();
    const tested = [
      [0, 0],
      [1, 0],
      [3, 2],
    ] as const;
    for (const [p, c] of tested) {
      s().choosePlan("player", planOf(p));
      s().choosePlan("crew", planOf(c));
      s().runSimulation();
    }
    const before = { ...s().board };
    playBatch(store, () => {});
    s().reportCeiling();
    expect(s().phase).toBe("ceiling");
    expect(playerTested(s())).toHaveLength(3);
    expect(s().engineeringRan).toBe(13);
    for (const k of ALL_CELLS) {
      const cell = s().board[k]!;
      if (before[k]) expect(cell).toEqual(before[k]);
      else expect(cell.by).toBe("engineering");
      expect(cell.rate).toBeLessThan(0.8);
    }
  });

  it("runs all 16 when the player tested none", () => {
    const store = createSoloStore(15);
    const s = () => store.getState();
    s().start();
    playBatch(store, () => {});
    s().reportCeiling();
    expect(s().engineeringRan).toBe(16);
    expect(playerTested(s())).toHaveLength(0);
  });
});
