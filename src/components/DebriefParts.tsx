// Pieces of the debrief shared by the solo phone screens and the TV.
import { pct } from "./StabilityMeter.tsx";
import type { OpenRates } from "../shared/chsh.ts";
import { S } from "../strings.ts";

export const fmt = (r: number | null) => (r === null ? "—" : pct(r));

export function Bars({ who, rates }: { who: string; rates: OpenRates }) {
  return (
    <div className="bars">
      {([0, 1] as const).map((light) => {
        const r = light === 0 ? rates.partnerGreen : rates.partnerRed;
        return (
          <div className="bar" key={light}>
            <span>{S.debrief.panel.row(who, S.light[light])}</span>
            <strong>{fmt(r)}</strong>
            <div className="bar__track">
              <div className="bar__fill" style={{ width: `${(r ?? 0) * 100}%` }} />
              <div className="bar__half" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
