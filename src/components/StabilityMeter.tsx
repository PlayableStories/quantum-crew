import { CLASSICAL_LIMIT, QUANTUM_LIMIT, SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import { S } from "../strings.ts";

// DECISION (2026-10-29): the bar spans the full 0–100%, both ends labelled, so a rate reads as what it is. The
// 75 / 80 / 85.4 lines sit close together, so their labels are placed apart: ceiling above (ending at its line),
// limit above (right-aligned to the bar's end, so it never runs off a 390px phone), survival below (ending at its
// line), 0% and 100% below at the ends.
const pos = (rate: number) => `${Math.min(1, Math.max(0, rate)) * 100}%`;

export const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

type Props = {
  value: number | null;
  label: string;
  /** The 75% line appears once the ceiling is revealed; the 85.4% line once the tool is in play. */
  showCeiling?: boolean;
  showLimit?: boolean;
};

export function StabilityMeter({ value, label, showCeiling = false, showLimit = false }: Props) {
  const ok = value !== null && value >= SURVIVAL_THRESHOLD;
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(value * 100)}>
      <div className="meter__head">
        <span className="kicker">{label}</span>
        <span className={`meter__value ${value === null ? "" : ok ? "meter__value--ok" : "meter__value--bad"}`}>
          {value === null ? "—" : pct(value)}
        </span>
      </div>
      <div className="meter__track">
        <div className={`meter__fill ${ok ? "meter__fill--ok" : ""}`} style={{ width: value === null ? 0 : pos(value) }} />
        {showCeiling && (
          <div className="meter__line meter__line--ceiling" style={{ left: pos(CLASSICAL_LIMIT) }}>
            <span>{S.meter.ceiling}</span>
          </div>
        )}
        <div className="meter__line meter__line--survival" style={{ left: pos(SURVIVAL_THRESHOLD) }}>
          <span>{S.meter.survival}</span>
        </div>
        {showLimit && (
          <>
            <div className="meter__line meter__line--limit" style={{ left: pos(QUANTUM_LIMIT) }} />
            <span className="meter__label meter__label--limit">{S.meter.limit}</span>
          </>
        )}
        <span className="meter__label meter__label--min">{S.meter.min}</span>
        <span className="meter__label meter__label--max">{S.meter.max}</span>
      </div>
    </div>
  );
}
