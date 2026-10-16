import type { Valve } from "../shared/chsh.ts";
import { CLOCKWISE } from "../shared/fiction.ts";

/** A circular arrow: ↻ for CLOCKWISE, ↺ for ANTICLOCKWISE. */
export function PumpIcon({ pump }: { pump: Valve }) {
  return (
    <svg className="pump__icon" viewBox="0 0 24 24" aria-hidden="true">
      <g transform={pump === CLOCKWISE ? undefined : "matrix(-1 0 0 1 24 0)"}>
        <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M18.6 2.8v5.6H13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
