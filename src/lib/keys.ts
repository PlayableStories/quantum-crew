// The keyboard shortcuts for solo (/solo) and the TV (/screen), in one place so both modes agree (K1). A pure mapping
// from a key press to an action, so tests can drive it without a DOM; each screen's listener does the action.
// Phones (/play) and the remote (/host) are touch-first and keep only their round keys (pumps, Enter follows).
//   Both:  D debug jump · F full screen · M mute · ? the shortcut sheet
//   Solo:  Space / Enter = the main (highlighted) button, outside a wave (rounds keep their own keys in Batch.tsx)
//   TV:    Space / → = the natural next step · P = play / pause · J = the join QR (after the lobby)
import { create } from "zustand";

export type KeyMode = "solo" | "tv";
export type KeyAction = "debug" | "fullscreen" | "mute" | "help" | "primary" | "next" | "playPause" | "join";

/** Where the key was pressed: typing in a field (or inside an open sheet), or on a control that Space / Enter would
 *  press anyway. */
export type KeyTarget = { typing: boolean; onControl: boolean };

export type KeyPress = { key: string; repeat?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean };

export function keyTarget(target: EventTarget | null): KeyTarget {
  const el = target as { closest?: (sel: string) => unknown } | null;
  const closest = (sel: string) => !!el?.closest?.(sel);
  return {
    typing: closest("input, select, textarea, [contenteditable], dialog"),
    onControl: closest("button, a, [role=radio], [role=button]"),
  };
}

export function keyAction(e: KeyPress, mode: KeyMode, where: KeyTarget, inWave = false): KeyAction | null {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (where.typing) return null;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // D, F, M and ? press nothing, so they also work with a button focused.
  if (k === "d") return "debug";
  if (k === "f") return "fullscreen";
  if (k === "m") return "mute";
  if (k === "?") return "help";
  if (k === "j" && mode === "tv") return "join"; // presses nothing either
  if (where.onControl) return null; // Space / Enter on a focused button press that button
  if (mode === "solo") return (k === " " || k === "Enter") && !inWave ? "primary" : null;
  if (k === "p") return "playPause";
  if (k === " " || k === "ArrowRight") return "next";
  return null;
}

/** Which shortcut sheet is open (the ? sheet or the debug jump); the header's ? button opens the first. */
export const useKeySheet = create<{ open: "help" | "debug" | null; set: (open: "help" | "debug" | null) => void }>()(
  (set) => ({ open: null, set: (open) => set({ open }) }),
);
