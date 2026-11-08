// Event pacing's times, shared by the room (which runs them) and the TV (which labels the speeds). In manual nothing
// is timed: the facilitator presses Next. Relaxed is generous; Brisk is the original event timing.
import {
  MP_ACT1_RESULT_MS,
  MP_ACT1_ROUND_MS,
  MP_RESULT_MS,
  MP_ROUND_MS,
  RELAXED_ACT1_ROUND_MS,
  RELAXED_RESULT_MS,
  RELAXED_ROUND_MS,
} from "../config.ts";
import type { Act, Speed } from "./protocol.ts";

/** Time to decide in an auto round. */
export function decisionMs(speed: Speed, act: Act): number {
  if (speed === "relaxed") return act === 1 ? RELAXED_ACT1_ROUND_MS : RELAXED_ROUND_MS;
  // Act III's round has one action (the pump), as Act II's: the same time.
  return act === 1 ? MP_ACT1_ROUND_MS : MP_ROUND_MS;
}

/** How long an auto result shows before the next round. */
export function resultMs(speed: Speed, act: Act): number {
  if (speed === "relaxed") return RELAXED_RESULT_MS;
  return act === 1 ? MP_ACT1_RESULT_MS : MP_RESULT_MS;
}

/** Seconds, for labels: 12000 → "12", 3500 → "3.5". */
export const secs = (ms: number) => String(Math.round(ms / 100) / 10);
