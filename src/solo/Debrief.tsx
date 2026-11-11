// The debrief: the only place physics words appear. Four steps: the Bell/CHSH wall, the Tsirelson bound,
// no-signalling (with the player's own numbers), and credits.
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { CreditsList } from "../components/CreditsList.tsx";
import { fmt } from "../components/DebriefParts.tsx";
import { NoSignalling, PlanVsCrystals, ThreeNumbers } from "../components/ReportParts.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { navigate } from "../lib/router.ts";
import { OPTIMAL_TUNING, exactOpenRates, openRatesByPartnerLight, winRate } from "../shared/chsh.ts";
import { planLine } from "../components/CrystalPlan.tsx";
import { answerPlanFor } from "../shared/crystalPlan.ts";
import { S } from "../strings.ts";
import { reportTuning, stationRate, stationSaved, useSolo } from "./soloStore.ts";

export function Debrief() {
  const s = useSolo((st) => st);
  const step = s.debriefStep;
  const steps = S.debrief.steps;
  const content = steps[step]!;
  const last = step === steps.length - 1;

  // The "your numbers" panel for this step: beside the explanation on landscape, under it on a phone.
  const numbers =
    step === 0 ? (
      <SoloThreeNumbers />
    ) : step === 1 && content.stat ? (
      <div className="panel stack">
        <p>{content.stat(pct(stationRate(s)))}</p>
        <SoloPlanVsCrystals />
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
        {"foot" in content && <p className="muted small debrief__foot">{content.foot}</p>}
      </div>
    </ScreenLayout>
  );
}

/** The quantum-limit step: the player's dials if they saved the station, else the best dials. */
function SoloPlanVsCrystals() {
  const s = useSolo((st) => st);
  const yours = stationSaved(s); // the player's dials only if they saved the station
  return (
    <PlanVsCrystals
      dials={{ a: yours ? reportTuning(s) : OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B }}
      label={S.debrief.compare.dials(yours, planLine(answerPlanFor("A")))}
    />
  );
}

/** The no-signalling step: exact 50% for both pumps, the player's own Act III rounds underneath. */
function NoSignallingPanel() {
  const tuning = useSolo((s) => s.tuning);
  const act3 = useSolo((s) => s.act3);
  const real = openRatesByPartnerLight(act3);
  const P = S.debrief.panel;
  return (
    <NoSignalling
      exact={exactOpenRates(tuning, OPTIMAL_TUNING.B)}
      who={{ a: P.you, b: P.crewmate }}
      real={act3.length > 0 ? P.yourRounds(act3.length, fmt(real.a.partnerGreen), fmt(real.a.partnerRed)) : null}
    />
  );
}

/** The incident report's first finding, for the player (see ReportParts' ThreeNumbers). */
function SoloThreeNumbers() {
  const s = useSolo((st) => st);
  return <ThreeNumbers act1={s.act1.length ? winRate(s.act1) : null} saved={stationSaved(s)} act3={stationRate(s)} />;
}
