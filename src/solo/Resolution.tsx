// The resolution: after the Act III gate passes (or the last Act III wave), the storm passes and the radio comes back.
// The station holds; CORA's first words in a while; then the incident report (the debrief).
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { useSolo } from "./soloStore.ts";

export function Resolution() {
  const openReport = useSolo((s) => s.openReport);
  return (
    <ScreenLayout
      className="resolution"
      header={<p className="kicker">{S.resolution.kicker}</p>}
      side={
        <>
          <p>{S.resolution.log}</p>
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
      {/* The station, stable: the storm has passed. */}
      <StationVisual rate={1} />
    </ScreenLayout>
  );
}
