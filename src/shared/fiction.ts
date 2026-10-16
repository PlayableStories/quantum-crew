// The station's fiction on top of the CHSH game in chsh.ts. The maths there is unchanged; this only names it.
// A coolant ring runs through both sections and each table controls the pump in its own section. Each sensor
// reads COOL or HOT (the input bits x, y), each pump runs CLOCKWISE or ANTICLOCKWISE (the output bits a, b).
// A relief vent between the sections unlocks only when BOTH are HOT, which is why the rule flips there.
import { CLOSED, GREEN, OPEN, RED, type Light, type RoundResult, type Valve } from "./chsh.ts";

export const COOL: Light = GREEN;
export const HOT: Light = RED;
export const CLOCKWISE: Valve = OPEN;
export const ANTICLOCKWISE: Valve = CLOSED;

/** What physically happened in a round. Stable: circulate, carry, purge. Lost: spike, overheat, slow. */
export type RoundCause = "circulate" | "carry" | "spike" | "overheat" | "purge" | "slow";

export function roundCause(r: Pick<RoundResult, "x" | "y" | "a" | "b">): RoundCause {
  if (r.a === null || r.b === null) return "slow";
  const agree = r.a === r.b;
  if (r.x === HOT && r.y === HOT) return agree ? "overheat" : "purge"; // vent unlocked
  if (!agree) return "spike"; // pumps fight against a locked vent
  return r.x === COOL && r.y === COOL ? "circulate" : "carry";
}

/** Whether a cause keeps the station stable. Matches `isWin` in chsh.ts (see fiction.test.ts). */
export const isStableCause = (c: RoundCause) => c === "circulate" || c === "carry" || c === "purge";
