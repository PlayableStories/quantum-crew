// Act I's sensor order: a short run of rounds with the radio working. Every combination of the two sensors appears at
// least once, so the player meets each case of the rule with both readings in hand, including a both-HOT round (a
// purge), never as the very first round. The rest comes from the caller's seeded RNG (the solo store, or the event
// room once per pair).
import { ACT1_ROUNDS } from "../config.ts";
import { drawInputs, type Light } from "./chsh.ts";
import type { Rng } from "./rng.ts";

export type SensorPair = readonly [Light, Light];

const ALL_PAIRS: readonly SensorPair[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

export function act1Order(rng: Rng, rounds: number = ACT1_ROUNDS): SensorPair[] {
  const order: SensorPair[] = [...ALL_PAIRS];
  while (order.length < rounds) {
    const { x, y } = drawInputs(rng);
    order.push([x, y]);
  }
  // Fisher–Yates shuffle with the seeded RNG.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  // A purge shouldn't open the night: if the first round is both HOT, swap it with the first round that isn't.
  if (order[0]![0] === 1 && order[0]![1] === 1) {
    const k = order.findIndex(([x, y]) => !(x === 1 && y === 1));
    [order[0], order[k]] = [order[k]!, order[0]!];
  }
  return order;
}
