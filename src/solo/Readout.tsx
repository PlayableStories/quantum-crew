// After each batch (comms open): how it went, over a banner of the station; CORA's reaction; and one card with the
// station meter and a look past small-sample luck: in Act II the plan's exact rate case by case ("If we both follow
// the plan perfectly"), with a luck line when the batch passed 80% but the plan can't; in Act III a 1,000-round test.
import { useEffect, useState } from "react";
import { FourCases } from "../components/FourCases.tsx";
import { playSfx } from "../audio/sfx.ts";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StabilityMeter, pct } from "../components/StabilityMeter.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { BATCH_SIZE } from "../config.ts";
import { SURVIVAL_THRESHOLD, classicalExpectedWinRate } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { actOf, canReportCeiling, debriefAvailable, displayedStability, luckLine, useSolo } from "./soloStore.ts";

export function Readout() {
  const s = useSolo((st) => st);
  const act = actOf(s.phase);
  const batchNo = act === 2 ? s.act2Batches : s.act3Batches;
  const wins = s.batch.filter((r) => r.win).length;
  const rounds = act === 2 ? s.act2 : s.act3;
  const value = displayedStability(s);
  const trueRate = classicalExpectedWinRate(s.plan, s.crewPlan);
  const [showCases, setShowCases] = useState(false);

  // Alarm once when a batch ends with the station below the survival line.
  const batchRate = wins / BATCH_SIZE;
  useEffect(() => {
    if (batchRate < SURVIVAL_THRESHOLD) playSfx("alarm", "solo");
  }, [batchRate]);

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
          {!(act === 2 && showCases) && (
            <StabilityMeter
              value={value}
              label={s.lastSim ? S.readout.simLabel : S.readout.actSoFar(rounds.length)}
              showCeiling={act === 3}
              showLimit={act === 3}
            />
          )}
          {act === 2 ? (
            <>
              {luckLine(batchRate, trueRate) && <p className="luck">{S.readout.luck(`${trueRate * 100}%`)}</p>}
              {/* The plan's exact rate, case by case (no sampling). */}
              <button className="btn btn--compact" aria-expanded={showCases} onClick={() => setShowCases((v) => !v)}>
                {S.readout.cases}
              </button>
              {showCases && <FourCases plan={s.plan} crewPlan={s.crewPlan} />}
            </>
          ) : (
            <button className="btn" onClick={s.runSimulation}>
              {S.readout.simulate}
              <small>{S.readout.simulateSub3}</small>
            </button>
          )}
        </div>
      }
    >
      <div className="readout__hero">
        <StationVisual rate={value} />
        <h1>{S.readout.held(wins, BATCH_SIZE)}</h1>
      </div>
      <CrewRadio />
    </ScreenLayout>
  );
}
