import { describe, expect, it } from "vitest";
import { BATCH_SIZE, ACT3_ROUND_MS } from "../config.ts";
import { ANTICLOCKWISE, CLOCKWISE } from "../shared/fiction.ts";
import { ALL_CELLS, cellKey, expectedBoard, planOf } from "./plans.ts";
import { createSoloStore, playerTried } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

type Store = ReturnType<typeof createSoloStore>;

function playBatch(store: Store, act: (s: Store) => void) {
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

describe("joint plan", () => {
  it("the crewmate plays whatever plan the player set for them", () => {
    const store = createSoloStore(9);
    const s = () => store.getState();
    toHuddle(s);
    s().choosePlan("crew", planOf(3)); // always anticlockwise
    playBatch(store, (st) => st.getState().answer(CLOCKWISE, 0));
    expect(s().batch.every((r) => r.b === ANTICLOCKWISE)).toBe(true);
    // Reverse when HOT: the crewmate's pump follows their own sensor.
    s().nextBatch();
    s().choosePlan("crew", planOf(1));
    playBatch(store, () => {}); // the crewmate still answers on a timeout
    expect(s().batch.every((r) => r.b === (r.y === 1 ? ANTICLOCKWISE : CLOCKWISE))).toBe(true);
  });

  it("records the pair on the board, at its exact rate, only once a batch with it has been played", () => {
    const store = createSoloStore(10);
    const s = () => store.getState();
    toHuddle(s);
    s().choosePlan("player", planOf(1));
    s().choosePlan("crew", planOf(2));
    expect(s().board).toEqual({});
    playBatch(store, () => {});
    expect(s().board[cellKey(planOf(1), planOf(2))]).toEqual({ rate: expectedBoard()["1-2"], by: "player" });
  });

  it("keeps a tried pair when the plan changes, and adds the next one after its batch", () => {
    const store = createSoloStore(12);
    const s = () => store.getState();
    toHuddle(s);
    playBatch(store, () => {}); // 0-0
    s().nextBatch();
    s().choosePlan("crew", planOf(3));
    expect(s().board["0-3"]).toBeUndefined();
    playBatch(store, () => {}); // 0-3
    expect(Object.keys(s().board).sort()).toEqual(["0-0", "0-3"]);
    for (const k of ["0-0", "0-3"] as const) expect(s().board[k]!.rate).toBeLessThan(0.8);
  });
});

describe("engineering report", () => {
  it("fills exactly the untried pairs at their exact rates, and keeps the player's", () => {
    const store = createSoloStore(14);
    const s = () => store.getState();
    toHuddle(s);
    const tried = [
      [0, 0],
      [1, 0],
      [3, 2],
    ] as const;
    for (const [i, [p, c]] of tried.entries()) {
      if (i > 0) s().nextBatch();
      s().choosePlan("player", planOf(p));
      s().choosePlan("crew", planOf(c));
      playBatch(store, () => {});
    }
    const before = { ...s().board };
    s().reportCeiling();
    expect(s().phase).toBe("ceiling");
    expect(playerTried(s())).toHaveLength(3);
    expect(s().engineeringRan).toBe(13);
    const exact = expectedBoard();
    for (const k of ALL_CELLS) {
      const cell = s().board[k]!;
      if (before[k]) expect(cell).toEqual(before[k]);
      else expect(cell).toEqual({ rate: exact[k], by: "engineering" });
    }
  });

  it("runs the other 15 after one batch", () => {
    const store = createSoloStore(15);
    const s = () => store.getState();
    toHuddle(s);
    playBatch(store, () => {});
    s().reportCeiling();
    expect(s().engineeringRan).toBe(15);
    expect(playerTried(s())).toHaveLength(1);
  });
});
