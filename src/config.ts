// Game tuning in one place: shared by the solo client and (from M3) the server.
import type { ClassicalStrategy, TuningConfig } from "./shared/chsh.ts";
import { CLOCKWISE } from "./shared/fiction.ts";

/** Time a player has to set their pump or tap MEASURE. */
// DECISION: 5 s (was 2.5 s), so solo players have time to think about the rule before answering.
export const ROUND_MS = 5000;
/** Solo Act I: rounds with the radio working (both readings known) before the storm. */
export const ACT1_ROUNDS = 6;
/** Solo Act I: time to hear CORA's reading, apply the rule and set the pump. */
export const ACT1_ROUND_MS = 8000;
/** Solo Act III: time to tap MEASURE, read the crystal's suggestion and set the pump. */
export const ACT3_ROUND_MS = 7000;
/** Rounds per batch, followed by a stability readout. */
export const BATCH_SIZE = 12;
/** Solo: a round's result stays until the player taps Next round, or this long, so a batch can't stall. */
export const RESULT_AUTO_MS = 6000;
/** Pause before the first light of a batch. */
export const LEAD_MS = 1200;

/** Event mode: what an AI crewmate in an empty seat plays in Act II. */
export const BOT_ACT2_PLAN: ClassicalStrategy = { onGreen: CLOCKWISE, onRed: CLOCKWISE };
/** Solo: the crewmate's starting Act II plan ("standard procedure"); the player can change it in the huddle. */
export const DEFAULT_CREW_PLAN: ClassicalStrategy = BOT_ACT2_PLAN;
/** Solo: the player's starting Act II plan (the same as the crewmate's). */
export const DEFAULT_PLAN: ClassicalStrategy = { onGreen: CLOCKWISE, onRed: CLOCKWISE };
// DECISION: the player's dials start at 0°/0°. Against the bot's 22.5°/157.5° that scores ≈ 68%, below the
// plan ceiling, so the tool only pays off once the player starts experimenting.
export const DEFAULT_TUNING: TuningConfig = { greenDeg: 0, redDeg: 0 };

/** Solo: Act II batches before the engineering report (the player may keep going). */
export const ACT2_BATCHES = 1;
/** Solo: Act III batches played with dials under an exact 80% before the hint unlocks. */
export const HINT_AFTER_FAILED_BATCHES = 1;
/** Solo: Act III batches after which the debrief unlocks even if the dials never reached an exact 80%. */
export const DEBRIEF_AFTER_BATCHES = 2;

// --- Event mode (multiplayer) -------------------------------------------------------------------

// DECISION: multiplayer rounds get longer than solo ones, to allow for phones and network lag.
/** Time a phone has to answer a round. */
export const MP_ROUND_MS = 3500;
/** How long the result of a round shows before the next light (the cause, the ring and a line of telemetry). */
// DECISION (E2a): 3.5 s, up from 1.5 s, so the cause can be read; tune after the first playtest.
export const MP_RESULT_MS = 3500;
/** Event Act I (the night shift, radio working): time to hear the partner's reading and set the pump. */
export const MP_ACT1_ROUND_MS = 8000;
/** Event Act I: a round ends early once every pump is set and none has changed for this long. */
export const ACT1_SETTLE_MS = 1500;
/** Event Act I: how long a round's result (its cause and the ring) shows before the next reading. */
export const MP_ACT1_RESULT_MS = 3500;
/** Event: the storm's static on the TV and phones before the TV shows the storm log. */
export const STORM_STATIC_MS = 6000;
/** Strategy huddle (the lull) length; the wave starts automatically when it ends. */
export const STRATEGY_MS = 45_000;
/** Pooled stability on the TV is the win rate of the last this-many rounds across all pairs. */
export const ROLLING_WINDOW = 48;
/** Up to 4 pairs: at most 4 players per table. */
export const MAX_PAIRS = 4;
