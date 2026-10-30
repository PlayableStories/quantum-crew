// The resolution: after the Act III gate passes (or the last Act III wave), the storm passes and the radio comes back.
// Saved (the gate passed): the station is calm and clear. Not saved (only the last wave was played): engineering held
// the core with emergency measures and the station is damaged. Either way the storm clears from the art, CORA speaks,
// and the incident report (the debrief) follows.
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { stationSaved, useSolo } from "./soloStore.ts";

export function Resolution() {
  const openReport = useSolo((s) => s.openReport);
  const saved = useSolo(stationSaved);
  return (
    <ScreenLayout
      className="resolution"
      header={<p className="kicker">{S.resolution.kicker}</p>}
      side={
        <>
          <p>{saved ? S.resolution.log : S.resolution.logNotSaved}</p>
          <CrewRadio />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={openReport}>
          {S.resolution.go}
        </button>
      }
    >
      <h1>{S.resolution.title}</h1>
      {/* The storm clears from the art: calm and clear when saved, damaged when not. */}
      {saved ? <StationVisual rate={1} clearing /> : <StationVisual rate={null} damaged clearing />}
    </ScreenLayout>
  );
}
