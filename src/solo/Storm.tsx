// The storm: after Act I's last round, CORA's voice breaks into static mid-sentence (step 1), then the station log
// explains (step 2): a solar storm arriving in waves, which the radio won't survive. The way on is the first lull, the
// Act II huddle. Two steps in the screen's own state, each moved on by a button (nothing runs away from the player).
import { useState } from "react";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { displayedStability, useSolo } from "./soloStore.ts";

export function Storm() {
  const s = useSolo((st) => st);
  const [step, setStep] = useState(0);
  const dots = (
    <div className="steps" aria-hidden="true">
      {[0, 1].map((i) => (
        <span key={i} className={i <= step ? "on" : ""} />
      ))}
    </div>
  );

  if (step === 0)
    return (
      <ScreenLayout
        className="storm"
        header={
          <>
            {dots}
            <p className="kicker">{S.storm.kicker}</p>
          </>
        }
        actions={
          <button className="btn btn--primary" onClick={() => setStep(1)}>
            {S.storm.next}
          </button>
        }
      >
        <h1>{S.storm.title}</h1>
        <CrewRadio interference />
        <StationVisual rate={displayedStability(s)} storm />
      </ScreenLayout>
    );

  return (
    <ScreenLayout
      className="storm"
      header={
        <>
          {dots}
          <p className="kicker">{S.storm.logKicker}</p>
        </>
      }
      side={
        <div className="stack">
          {S.storm.log.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      }
      actions={
        <button className="btn btn--primary" onClick={s.endStorm}>
          {S.storm.go}
          <small>{S.storm.goSub}</small>
        </button>
      }
    >
      <h1>{S.storm.logTitle}</h1>
      <StationVisual rate={displayedStability(s)} storm />
    </ScreenLayout>
  );
}
