// Event pacing's times, shared by the room (which runs them) and the TV (which shows the countdown). Guided has no
// timers: the facilitator closes rounds and moves on. Relaxed is generous; Brisk is the original event timing.
import {
  MP_ACT1_RESULT_MS,
  MP_ACT1_ROUND_MS,
  MP_ACT3_ROUND_MS,
  MP_RESULT_MS,
  MP_ROUND_MS,
  RELAXED_ACT1_ROUND_MS,
  RELAXED_RESULT_MS,
  RELAXED_ROUND_MS,
} from "../config.ts";
import type { Act, Pace } from "./protocol.ts";

/** Time to decide in a round (null: no countdown). */
export function decisionMs(pace: Pace, act: Act): number | null {
  if (pace === "guided") return null;
  if (pace === "relaxed") return act === 1 ? RELAXED_ACT1_ROUND_MS : RELAXED_ROUND_MS;
  return act === 1 ? MP_ACT1_ROUND_MS : act === 3 ? MP_ACT3_ROUND_MS : MP_ROUND_MS;
}

/** How long a result shows before the next round (null: until the facilitator presses Next round). */
export function resultMs(pace: Pace, act: Act): number | null {
  if (pace === "guided") return null;
  if (pace === "relaxed") return RELAXED_RESULT_MS;
  return act === 1 ? MP_ACT1_RESULT_MS : MP_RESULT_MS;
}
