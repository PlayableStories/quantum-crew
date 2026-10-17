// After each batch (comms open): how it went, over a banner of the station; the crewmate's reaction; and one card with
// the 1,000-round test, to see past small-sample luck. In Act II the test lands on the plan board (one line says so).
import { useEffect } from "react";
import { playSfx } from "../audio/sfx.ts";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StabilityMeter, pct } from "../components/StabilityMeter.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { BATCH_SIZE } from "../config.ts";
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { actOf, canReportCeiling, debriefAvailable, displayedStability, useSolo } from "./soloStore.ts";

export function Readout() {
  const s = useSolo((st) => st);
  const act = actOf(s.phase);
  const batchNo = act === 2 ? s.act2Batches : s.act3Batches;
  const wins = s.batch.filter((r) => r.win).length;
  const rounds = act === 2 ? s.act2 : s.act3;
  const value = displayedStability(s);

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
          <>
            {canReportCeiling(s) && (
              <button className="btn btn--primary" onClick={s.reportCeiling}>
                {S.readout.report}
              </button>
            )}
            <button className={`btn ${canReportCeiling(s) ? "" : "btn--primary"}`} onClick={s.nextBatch}>
              {S.readout.again2}
            </button>
          </>
        ) : (
          <>
            {debriefAvailable(s) && (
              <button className="btn btn--primary" onClick={s.startDebrief}>
                {S.readout.debrief}
              </button>
            )}
            <button className={`btn ${debriefAvailable(s) ? "" : "btn--primary"}`} onClick={s.nextBatch}>
              {S.readout.again3}
            </button>
          </>
        )
      }
      side={
        <div className="panel stack test-card">
          <StabilityMeter
            value={value}
            label={s.lastSim ? S.readout.simLabel : S.readout.actSoFar(rounds.length)}
            showCeiling={act === 3}
            showLimit={act === 3}
          />
          {act === 2 && s.lastSim && <p className="muted small">{S.readout.added(pct(s.lastSim.winRate))}</p>}
          <button className="btn" onClick={s.runSimulation}>
            {S.readout.simulate}
            <small>{act === 2 ? S.readout.simulateSub2 : S.readout.simulateSub3}</small>
          </button>
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
