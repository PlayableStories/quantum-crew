// Who hears what (A1): the decisions behind every sound, kept pure so tests drive them without audio or a DOM.
// Solo's screen and the event TV carry the game's sound; a phone only ever hears its own player: their pump (tap)
// and their own pair's result (win / lost). See the README's "Sound" table.
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import type { Sfx } from "./sfx.ts";

/** The only sounds an event phone ever plays: its own action and its own consequence. */
export const PHONE_CUES: readonly Sfx[] = ["tap", "win", "lost"];

/** A round's result, in solo (yours) or on a phone (your pair's): held or lost (a too-slow round is lost). */
export const roundCue = (result: { win: boolean }): Sfx => (result.win ? "win" : "lost");

/** A phone's result cue: only for a new result flash (the same flash again plays nothing). */
export function phoneCues(prevRoundId: string | null, flash: { roundId: string; win: boolean } | null): Sfx[] {
  if (!flash || flash.roundId === prevRoundId) return [];
  return [roundCue(flash)];
}

/** What the TV remembers between updates. */
export type TvMemory = { roundId?: string; rolling: number | null; phase?: string };

type TvState = {
  phase: string;
  stationSaved: boolean;
  stability: { rolling: number | null };
  lastBatch: { wins: number; rounds: number } | null;
};

/** The room's sounds on the TV for a new round result (win when at least half the pairs held). */
export function tvResultCues(mem: TvMemory, results: { roundId: string; results: { win: boolean }[] } | null): Sfx[] {
  if (!results || results.roundId === mem.roundId) return [];
  mem.roundId = results.roundId;
  const wins = results.results.filter((r) => r.win).length;
  return results.results.length && wins * 2 >= results.results.length ? ["win"] : [];
}

/** The room's sounds on the TV for a new state: the alarm when the pooled gauge crosses below 80% or a wave ends
 *  under it, the storm hitting, the tool's reveal, and the station saved when the storm passes. Updates `mem`. */
export function tvStateCues(mem: TvMemory, state: TvState): Sfx[] {
  const cues: Sfx[] = [];
  const r = state.stability.rolling;
  const entered = (phase: string) => state.phase === phase && mem.phase !== phase;
  const crossed = mem.rolling !== null && r !== null && mem.rolling >= SURVIVAL_THRESHOLD && r < SURVIVAL_THRESHOLD;
  const batchLow =
    entered("batchDone") && !!state.lastBatch && state.lastBatch.wins / Math.max(1, state.lastBatch.rounds) < SURVIVAL_THRESHOLD;
  if (crossed || batchLow) cues.push("alarm");
  if (entered("storm")) cues.push("storm");
  if (entered("tool")) cues.push("reveal");
  if (entered("resolution") && state.stationSaved) cues.push("saved");
  mem.rolling = r;
  mem.phase = state.phase;
  return cues;
}
