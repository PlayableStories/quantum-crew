// The incident report's panels, shared by solo's debrief and the event TV (and the event phones' own numbers). They
// take their numbers and labels as props: solo passes the player's, the TV the crew's. Exact maths from chsh.ts.
import type { ReactNode } from "react";
import { Bars } from "./DebriefParts.tsx";
import { formatDeg } from "./Dial.tsx";
import { LightIcon } from "./SensorLight.tsx";
import { pct } from "./StabilityMeter.tsx";
import { DEFAULT_CREW_PLAN } from "../config.ts";
import {
  OPTIMAL_TUNING,
  classicalCases,
  quantumCases,
  quantumExpectedWinRate,
  type Light,
  type OpenRates,
  type TuningConfig,
} from "../shared/chsh.ts";
import { HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";

/**
 * The quantum-limit step: the best plan and the crystals side by side, four cases each. A plan holds three cases
 * every time and loses the fourth every time (75%); the crystals hold every case about 85% of the time.
 * `dials` are the right column's (solo: the player's if they saved the station; the TV: the best pair's), else the
 * best dials; `label` names them.
 */
export function PlanVsCrystals({ dials, label }: { dials: { a: TuningConfig; b: TuningConfig }; label: ReactNode }) {
  const plan = classicalCases(DEFAULT_CREW_PLAN, DEFAULT_CREW_PLAN);
  const crystals = quantumCases(dials.a, dials.b);
  const C = S.debrief.compare;
  const whole = (p: number) => `${Math.round(p * 100)}%`;
  return (
    <div className="stack">
      <div className="compare">
        <div className="compare__col">
          <p className="kicker">
            {C.plan}
            <b className="compare__rate">{"\u00a0·\u00a075%"}</b>
          </p>
          <ul>
            {plan.map((c) => (
              <li key={`${c.x}${c.y}`} className={c.win ? "case--win" : "case--loss"}>
                <Sensors x={c.x} y={c.y} />
                <b>{c.win ? "✓ 100%" : "✗ 0%"}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="compare__col">
          <p className="kicker">
            {label}
            <b className="compare__rate">{`\u00a0·\u00a0${pct(crystals.reduce((sum, c) => sum + c.pWin, 0) / 4)}`}</b>
          </p>
          <ul>
            {crystals.map((c) => (
              <li key={`${c.x}${c.y}`} className="case--win">
                <Sensors x={c.x} y={c.y} />
                <span className="muted compare__angles">
                  {formatDeg(c.thetaA)}·{formatDeg(c.thetaB)}
                </span>
                <b>{whole(c.pWin)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="small">{C.why}</p>
    </div>
  );
}

function Sensors({ x, y }: { x: Light; y: Light }) {
  return (
    <span className="compare__sensors">
      <span className={x === HOT ? "case__reading--hot" : "case__reading--cool"}>
        <LightIcon light={x} />
      </span>
      <span className={y === HOT ? "case__reading--hot" : "case__reading--cool"}>
        <LightIcon light={y} />
      </span>
    </span>
  );
}

/** Each pump's clockwise rate split by the partner's sensor, exactly: 50% both ways, so no message gets through.
 *  `real` (solo: the player's own Act III rounds; the TV: the whole crew's) sits underneath for comparison. */
export function NoSignalling({
  exact,
  who,
  real,
}: {
  exact: { a: OpenRates; b: OpenRates };
  who: { a: string; b: string };
  real: string | null;
}) {
  const P = S.debrief.panel;
  return (
    <div className="panel stack">
      <p className="kicker">{P.head}</p>
      <Bars who={who.a} rates={exact.a} />
      <Bars who={who.b} rates={exact.b} />
      {real && <p className="muted small">{real}</p>}
      <p className="small">{S.report.noJam}</p>
    </div>
  );
}

/** The best dials' exact rate (the Tsirelson bound, ≈ 85.4%). */
export const BEST_RATE = quantumExpectedWinRate(OPTIMAL_TUNING.A, OPTIMAL_TUNING.B);

/** Copy for ThreeNumbers' "yours" lines: solo's by default (you); the TV passes the crew's. */
export type ThreeNumbersCopy = {
  act1Yours: (pct: string) => string;
  act3Note: string;
  act3Yours: (pct: string) => string;
  story: string;
  storyNotSaved: string;
};

/**
 * The incident report's first finding: the game's three numbers side by side. Act I with the radio (every round
 * winnable; the player's or crew's own Act I score too), Act II's best plan (exactly 75%), and Act III's crystals (the
 * dial settings' exact rate, about 85% at best). If the station wasn't saved, the Act III card leads with the best
 * dials and shows theirs underneath, and the summary says only the best settings beat every plan.
 */
export function ThreeNumbers({
  act1,
  saved,
  act3,
  copy = S.report,
}: {
  act1: number | null;
  saved: boolean;
  act3: number | null;
  copy?: ThreeNumbersCopy;
}) {
  const R = S.report;
  const own = act1 === null ? null : pct(act1);
  const showOwn = saved && act3 !== null;
  return (
    <div className="panel stack">
      <ul className="three">
        <li>
          <span className="kicker">{R.act1}</span>
          <b className="three__big">100%</b>
          <span className="muted small">{own === null ? R.act1Possible : copy.act1Yours(own)}</span>
        </li>
        <li>
          <span className="kicker">{R.act2}</span>
          <b className="three__big">75%</b>
          <span className="muted small">{R.act2Note}</span>
        </li>
        <li>
          <span className="kicker">{R.act3}</span>
          {/* Saved: their dials. Not saved: the best dials lead, theirs below (no false claim). */}
          <b className="three__big">{pct(showOwn ? act3 : BEST_RATE)}</b>
          <span className="muted small">{showOwn ? copy.act3Note : R.act3Best}</span>
          {!showOwn && act3 !== null && <span className="muted small three__yours">{copy.act3Yours(pct(act3))}</span>}
        </li>
      </ul>
      <p className="small">{saved ? copy.story : copy.storyNotSaved}</p>
    </div>
  );
}
