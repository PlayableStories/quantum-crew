// "If we both follow the crystals": the four sensor combinations (each equally likely) with both dial angles and the
// exact chance the round holds if both follow their crystals; then the settings' true rate. Exact, from chsh.ts
// quantumCases: no sampling.
import { quantumCases, type TuningConfig } from "../shared/chsh.ts";
import { HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewName } from "./AiBadge.tsx";
import { formatDeg } from "./Dial.tsx";
import { LightIcon } from "./SensorLight.tsx";

const whole = (p: number) => `${Math.round(p * 100)}%`;

type Props = { tuning: TuningConfig; crew: TuningConfig; title?: string };

export function CrystalCases({ tuning, crew, title }: Props) {
  const cases = quantumCases(tuning, crew);
  const rate = cases.reduce((sum, c) => sum + c.pWin, 0) / 4;
  return (
    <div className="cases cases--crystal">
      {title && <p className="kicker">{title}</p>}
      <p className="muted small cases__order">
        {S.readout.crystalCasesHead}
        <CrewName />
      </p>
      <ul className="cases__grid">
        {cases.map((c) => (
          <li key={`${c.x}${c.y}`} className={`case ${c.pWin >= 0.5 ? "case--win" : "case--loss"}`}>
            <span className="case__sensors">
              <Reading light={c.x} /> · <Reading light={c.y} />
            </span>
            <span className="case__pumps">
              {formatDeg(c.thetaA)} · {formatDeg(c.thetaB)}
            </span>
            <span className="case__verdict">{S.readout.holds(whole(c.pWin))}</span>
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
