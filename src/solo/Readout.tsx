// After each batch (comms open): how it went, over a banner of the station; CORA's reaction; and one card with the
// station meter and a look past small-sample luck: in Act II the plan's exact rate case by case ("If we both follow
// the plan perfectly"), with a luck line when the batch passed 80% but the plan can't; in Act III a 1,000-round test.
import { useEffect, useState } from "react";
import { CrystalCases } from "../components/CrystalCases.tsx";
import { FourCases } from "../components/FourCases.tsx";
import { playSfx } from "../audio/sfx.ts";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StabilityMeter, pct } from "../components/StabilityMeter.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { BATCH_SIZE } from "../config.ts";
import { OPTIMAL_TUNING, SURVIVAL_THRESHOLD, classicalExpectedWinRate } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import {
  actOf,
  canReportCeiling,
  debriefAvailable,
  dialsRate,
  displayedStability,
  followedCount,
  lastWave,
  luckGap,
  useSolo,
} from "./soloStore.ts";

export function Readout() {
  const s = useSolo((st) => st);
  const act = actOf(s.phase) === 2 ? 2 : 3; // a readout only follows an Act II or Act III batch
  const batchNo = lastWave(s); // the storm wave that just ended (counted across Acts II and III)
  const wins = s.batch.filter((r) => r.win).length;
  const rounds = act === 2 ? s.act2 : s.act3;
  const value = displayedStability(s);
  const trueRate = act === 2 ? classicalExpectedWinRate(s.plan, s.crewPlan) : dialsRate(s);
  const trueText = act === 2 ? `${trueRate * 100}%` : `${(trueRate * 100).toFixed(1)}%`;
  const [showCases, setShowCases] = useState(false);

  // Alarm once when a batch ends with the station below the survival line.
  const batchRate = wins / BATCH_SIZE;
  useEffect(() => {
    if (batchRate < SURVIVAL_THRESHOLD) playSfx("alarm", "solo");
  }, [batchRate]);
  const gap = luckGap(batchRate, trueRate);

  return (
    <ScreenLayout
      header={<p className="kicker">{S.readout.kicker(batchNo)}</p>}
      actions={
        act === 2 ? (
          <div className="row">
            {canReportCeiling(s) && (
              <button className="btn btn--primary" onClick={s.reportCeiling}>
                {S.readout.report}
              </button>
            )}
            <button className={`btn ${canReportCeiling(s) ? "" : "btn--primary"}`} onClick={s.nextBatch}>
              {S.readout.again2}
            </button>
          </div>
        ) : (
          <div className="row">
            {debriefAvailable(s) && (
              <button className="btn btn--primary" onClick={s.startDebrief}>
                {S.readout.debrief}
              </button>
            )}
            <button className={`btn ${debriefAvailable(s) ? "" : "btn--primary"}`} onClick={s.nextBatch}>
              {S.readout.again3}
            </button>
          </div>
        )
      }
      side={
        <div className="panel stack test-card">
          {/* With the four cases open, they take the meter's place (the headline still says how the batch went). */}
          {!showCases && (
            <StabilityMeter
              value={value}
              label={S.readout.actSoFar(rounds.length)}
              showCeiling={act === 3}
              showLimit={act === 3}
            />
          )}
          {act === 3 && !showCases && <p className="muted small">{S.readout.followed(followedCount(s), BATCH_SIZE)}</p>}
          {gap && <p className="luck">{S.readout.luck(gap, act, trueText)}</p>}
          {/* The exact rate, case by case (no sampling): the plan in Act II, the dial settings in Act III. */}
          <button className="btn btn--compact" aria-expanded={showCases} onClick={() => setShowCases((v) => !v)}>
            {act === 2 ? S.readout.cases : S.readout.crystalCases}
          </button>
          {showCases &&
            (act === 2 ? (
              <FourCases plan={s.plan} crewPlan={s.crewPlan} />
            ) : (
              <CrystalCases tuning={s.tuning} crew={OPTIMAL_TUNING.B} />
            ))}
        </div>
      }
    >
      <div className="readout__hero">
        {/* The storm lasts until the resolution. */}
        <StationVisual rate={value} storm />
        <h1>{S.readout.held(wins, BATCH_SIZE)}</h1>
      </div>
      <CrewRadio />
    </ScreenLayout>
  );
}
