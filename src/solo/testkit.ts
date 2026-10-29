// Test helper: from the intro to the first Act II huddle, the way a player gets there. Plays Act I following the rule
// with both readings (match CORA's clockwise unless both are HOT), then leaves the storm screen.
import { ACT1_ROUND_MS, ACT1_ROUNDS } from "../config.ts";
import { CLOCKWISE } from "../shared/fiction.ts";
import type { Valve } from "../shared/chsh.ts";
import type { SoloState } from "./soloStore.ts";

/** The pump the rule asks for when both readings are known and CORA holds clockwise. */
export const rulePump = (x: 0 | 1, y: 0 | 1): Valve => ((x & y) ^ CLOCKWISE) as Valve;

/** Plays Act I's rounds with `act` (default: follow the rule), ending on the storm screen. */
export function playAct1(s: () => SoloState, act: (x: 0 | 1, y: 0 | 1, now: number) => void = (x, y, now) => s().answer(rulePump(x, y), now)) {
  s().start();
  let now = 0;
  for (let i = 0; i < ACT1_ROUNDS; i++) {
    s().advance(now);
    const r = s().round!;
    act(r.x, r.y, now);
    now += ACT1_ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

/** Intro → Act I (played by the rule) → the storm → the first huddle. */
export function toHuddle(s: () => SoloState) {
  playAct1(s);
  s().endStorm();
}
