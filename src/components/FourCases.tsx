// "If we both follow the plan perfectly": the four sensor combinations (each equally likely) under a pair of plans,
// with the pump each side's plan gives, the outcome and its cause, and ✓ or ✗; then the plan's true rate (wins of 4).
// Exact, from chsh.ts classicalCases: no sampling.
import { classicalCases, type ClassicalStrategy } from "../shared/chsh.ts";
import { HOT, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import type { ReactNode } from "react";
import { CrewName } from "./AiBadge.tsx";
import { PumpIcon } from "./PumpIcon.tsx";
import { LightIcon } from "./SensorLight.tsx";

/** `order` says whose reading comes first on each card (default "you · CORA"; the TV says "Table A · Table B"). */
export function FourCases({
  plan,
  crewPlan,
  order,
}: {
  plan: ClassicalStrategy;
  crewPlan: ClassicalStrategy;
  order?: ReactNode;
}) {
  const cases = classicalCases(plan, crewPlan);
  const wins = cases.filter((c) => c.win).length;
  return (
    <div className="cases">
      <p className="kicker">{S.readout.casesHead}</p>
      <p className="muted small cases__order">
        {order ?? (
          <>
            {S.readout.casesOrder}
            <CrewName />
          </>
        )}
      </p>
      <ul className="cases__grid">
        {cases.map((c) => (
          <li key={`${c.x}${c.y}`} className={`case ${c.win ? "case--win" : "case--loss"}`}>
            {/* Each line reads "you · CORA". */}
            <span className="case__sensors">
              <Reading light={c.x} /> · <Reading light={c.y} />
            </span>
            <span className="case__pumps">
              <PumpIcon pump={c.a} /> {S.pumpShort[c.a]} · <PumpIcon pump={c.b} /> {S.pumpShort[c.b]}
            </span>
            <span className="case__verdict">
              {c.win ? "✓" : "✗"} {S.outcome[roundCause(c)].title}
            </span>
          </li>
        ))}
      </ul>
      <p className="cases__total">
        <strong>{S.readout.caseTotal(wins, `${(wins / 4) * 100}%`)}</strong>
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
