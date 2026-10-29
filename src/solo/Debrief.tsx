// The debrief: the only place physics words appear. Four steps: the Bell/CHSH wall, the Tsirelson bound,
// no-signalling (with the player's own numbers), and credits.
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { CreditsList } from "../components/CreditsList.tsx";
import { Bars, fmt } from "../components/DebriefParts.tsx";
import { formatDeg } from "../components/Dial.tsx";
import { LightIcon } from "../components/SensorLight.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { DEFAULT_CREW_PLAN } from "../config.ts";
import { navigate } from "../lib/router.ts";
import {
  OPTIMAL_TUNING,
  SURVIVAL_THRESHOLD,
  classicalCases,
  exactOpenRates,
  openRatesByPartnerLight,
  quantumCases,
  winRate,
  type Light,
} from "../shared/chsh.ts";
import { HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { dialsRate, useSolo } from "./soloStore.ts";

export function Debrief() {
  const s = useSolo((st) => st);
  const step = s.debriefStep;
  const steps = S.debrief.steps;
  const content = steps[step]!;
  const last = step === steps.length - 1;

  // The "your numbers" panel for this step: beside the explanation on landscape, under it on a phone.
  const numbers =
    step === 0 ? (
      <ThreeNumbers />
    ) : step === 1 && content.stat ? (
      <div className="panel stack">
        <p>{content.stat(pct(dialsRate(s)))}</p>
        <PlanVsCrystals />
      </div>
    ) : step === 2 ? (
      <NoSignallingPanel />
    ) : last ? (
      <CreditsList />
    ) : undefined;

  return (
    <ScreenLayout
      className="debrief"
      side={numbers}
      header={
        <>
          <div className="steps" aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} className={i <= step ? "on" : ""} />
            ))}
          </div>
          <p className="kicker">{S.report.kicker}</p>
        </>
      }
      actions={
        last ? (
          <div className="row">
            <button className="btn" onClick={() => navigate("/")}>
              {S.debrief.home}
            </button>
            <button className="btn btn--primary" onClick={s.reset}>
              {S.debrief.again}
            </button>
          </div>
        ) : (
          <div className="row">
            {step > 0 && (
              <button className="btn" onClick={() => s.setDebriefStep(step - 1)}>
                {S.debrief.back}
              </button>
            )}
            <button className="btn btn--primary" onClick={() => s.setDebriefStep(step + 1)}>
              {S.debrief.next}
            </button>
          </div>
        )
      }
    >
      <h1>{content.title}</h1>
      <div className="stack">
        {content.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </ScreenLayout>
  );
}

/**
 * The quantum-limit step: the best plan and the crystals side by side, four cases each. A plan holds three cases
 * every time and loses the fourth every time (75%); the crystals hold every case about 85% of the time.
 * The right column shows the player's dials if they passed, else the best dials.
 */
function PlanVsCrystals() {
  const s = useSolo((st) => st);
  const yours = dialsRate(s) >= SURVIVAL_THRESHOLD;
  const plan = classicalCases(DEFAULT_CREW_PLAN, DEFAULT_CREW_PLAN);
  const crystals = quantumCases(yours ? s.tuning : OPTIMAL_TUNING.A, OPTIMAL_TUNING.B);
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
            {C.dials(yours)}
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
 *  The player's own Act III rounds sit underneath for comparison. */
function NoSignallingPanel() {
  const tuning = useSolo((s) => s.tuning);
  const act3 = useSolo((s) => s.act3);
  const exact = exactOpenRates(tuning, OPTIMAL_TUNING.B);
  const real = openRatesByPartnerLight(act3);
  const P = S.debrief.panel;
  return (
    <div className="panel stack">
      <p className="kicker">{P.head}</p>
      <Bars who={P.you} rates={exact.a} />
      <Bars who={P.crewmate} rates={exact.b} />
      {act3.length > 0 && (
        <p className="muted small">{P.yourRounds(act3.length, fmt(real.a.partnerGreen), fmt(real.a.partnerRed))}</p>
      )}
      <p className="small">{S.report.noJam}</p>
    </div>
  );
}

/**
 * The incident report's first finding: the game's three numbers side by side. Act I with the radio (every round
 * winnable; the player's own Act I score too), Act II's best plan (exactly 75%), and Act III's crystals (the player's
 * dial settings' exact rate, about 85% at best).
 */
function ThreeNumbers() {
  const s = useSolo((st) => st);
  const R = S.report;
  const act1 = s.act1.length ? pct(winRate(s.act1)) : null;
  return (
    <div className="panel stack">
      <ul className="three">
        <li>
          <span className="kicker">{R.act1}</span>
          <b className="three__big">100%</b>
          <span className="muted small">{act1 === null ? R.act1Possible : R.act1Yours(act1)}</span>
        </li>
        <li>
          <span className="kicker">{R.act2}</span>
          <b className="three__big">75%</b>
          <span className="muted small">{R.act2Note}</span>
        </li>
        <li>
          <span className="kicker">{R.act3}</span>
          <b className="three__big">{pct(dialsRate(s))}</b>
          <span className="muted small">{R.act3Note}</span>
        </li>
      </ul>
      <p className="small">{R.story}</p>
    </div>
  );
}
