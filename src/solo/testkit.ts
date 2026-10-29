// Test helper: from the intro to the first Act II huddle, the way a player gets there. Plays Act I following the rule
// with both readings and CORA's called pump (match her unless both are HOT), then leaves the storm screen.
import { ACT1_ROUND_MS, ACT1_ROUNDS } from "../config.ts";
import type { Valve } from "../shared/chsh.ts";
import type { SoloState } from "./soloStore.ts";

/** The pump the rule asks for when both readings and CORA's pump are known: match her, unless both are HOT. */
export const rulePump = (x: 0 | 1, y: 0 | 1, crew: Valve): Valve => ((x & y) ^ crew) as Valve;

type Act1Move = (x: 0 | 1, y: 0 | 1, crew: Valve, now: number) => void;

/** Plays Act I's rounds with `act` (default: follow the rule), ending on the storm screen. */
export function playAct1(s: () => SoloState, act: Act1Move = (x, y, crew, now) => s().answer(rulePump(x, y, crew), now)) {
  s().start();
  let now = 0;
  for (let i = 0; i < ACT1_ROUNDS; i++) {
    s().advance(now);
    const r = s().round!;
    act(r.x, r.y, r.crewPump!, now);
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
