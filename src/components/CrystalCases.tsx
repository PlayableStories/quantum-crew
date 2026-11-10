// "If we both follow the crystals": the four sensor combinations (each equally likely) with both dial angles and the
// exact chance the round holds if both follow their crystals; then the settings' true rate. Exact, from chsh.ts
// quantumCases: no sampling.
import type { ReactNode } from "react";
import { quantumCases, type TuningConfig } from "../shared/chsh.ts";
import { HOT } from "../shared/fiction.ts";
import { settingGap, weakestCase } from "../shared/crystalPlan.ts";
import { S } from "../strings.ts";
import { CrewName } from "./AiBadge.tsx";
import { formatDeg } from "../lib/formatDeg.ts";
import { LightIcon } from "./SensorLight.tsx";

const whole = (p: number) => `${Math.round(p * 100)}%`;

/** `order` says whose dial comes first on each card (default "dials you · CORA"; the TV says Table A · Table B). */
type Props = { tuning: TuningConfig; crew: TuningConfig; title?: string; order?: ReactNode; gaps?: boolean; weakest?: boolean };

/** `gaps` (event mode's wave done) adds each case's gap between the two settings (solo leaves it out). */
export function CrystalCases({ tuning, crew, title, order, gaps = false, weakest = false }: Props) {
  const cases = quantumCases(tuning, crew);
  // Clue 2 (event mode): the pair's weakest case is outlined (the TV's hint beside the true rate says which way to move).
  const weak = weakest ? weakestCase(tuning, crew) : null;
  const rate = cases.reduce((sum, c) => sum + c.pWin, 0) / 4;
  return (
    <div className={`cases cases--crystal ${gaps ? "cases--gaps" : ""}`}>
      {title && <p className="kicker">{title}</p>}
      <p className="muted small cases__order">
        {order ?? (
          <>
            {S.readout.crystalCasesHead}
            <CrewName />
          </>
        )}
      </p>
      <ul className="cases__grid">
        {cases.map((c) => (
          <li
            key={`${c.x}${c.y}`}
            className={`case ${c.pWin >= 0.5 ? "case--win" : "case--loss"} ${weak && weak.x === c.x && weak.y === c.y ? "case--weakest" : ""}`}
          >
            <span className="case__sensors">
              <Reading light={c.x} /> · <Reading light={c.y} />
            </span>
            <span className="case__pumps">
              {/* Event mode's wave done: the gap (the settings are in the pair's header); solo: both angles. */}
              {gaps ? (
                <span className="case__gap">{S.event.wave3.gap(formatDeg(settingGap(c.thetaA, c.thetaB)))}</span>
              ) : (
                <>
                  {formatDeg(c.thetaA)} · {formatDeg(c.thetaB)}
                </>
              )}
            </span>
            <span className="case__verdict">{gaps ? whole(c.pWin) : S.readout.holds(whole(c.pWin))}</span>
          </li>
        ))}
      </ul>
      <p className="cases__total">
        <strong>{S.readout.trueRate(`${(rate * 100).toFixed(1)}%`)}</strong>
      </p>
    </div>
  );
}

function Reading({ light }: { light: 0 | 1 }) {
  return (
    <span className={`case__reading case__reading--${light === HOT ? "hot" : "cool"}`}>
      <LightIcon light={light} />
      {S.light[light]}
    </span>
  );
}
