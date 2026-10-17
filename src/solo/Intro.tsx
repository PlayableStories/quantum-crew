// The station log, in two steps (same stepper as the debrief): 1. the story and the station art; 2. the full station
// rule with the ring diagram and the 80% line. The only place the full rule shows by default; elsewhere it's the
// RuleChip. The step is the screen's own state: the store only learns that the player took their post.
import { useState } from "react";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { Rule } from "../components/Rule.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { S } from "../strings.ts";
import { useSolo } from "./soloStore.ts";

const STEPS = 2;

export function Intro() {
  const start = useSolo((s) => s.start);
  const [step, setStep] = useState(0);
  const header = (
    <>
      <div className="steps" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <p className="kicker">{S.intro.kicker}</p>
    </>
  );

  if (step === 0)
    return (
      <ScreenLayout
        header={header}
        side={
          <div className="stack">
            {S.intro.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        }
        actions={
          <button className="btn btn--primary" onClick={() => setStep(1)}>
            {S.intro.next}
          </button>
        }
      >
        <h1>{S.title}</h1>
        <StationVisual rate={null} />
      </ScreenLayout>
    );

  return (
    <ScreenLayout
      header={header}
      side={
        <>
          <Rule />
          <p>
            <strong>{S.intro.survival}</strong>
          </p>
        </>
      }
      actions={
        <div className="row">
          <button className="btn" onClick={() => setStep(0)}>
            {S.intro.back}
          </button>
          <button className="btn btn--primary" onClick={start}>
            {S.intro.go}
          </button>
        </div>
      }
    >
      <div className="panel rule">
        <RingDiagram />
      </div>
    </ScreenLayout>
  );
}
