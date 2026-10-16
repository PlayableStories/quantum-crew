// End of Act II: the wall is named. Engineering fills in every plan the crew didn't test, so the whole board is
// visible and none of it beats 75%. Still no physics words; those wait for the debrief.
import { PlanBoard } from "../components/PlanBoard.tsx";
import { StabilityMeter } from "../components/StabilityMeter.tsx";
import { winRate } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { playerTested, useSolo } from "./soloStore.ts";

export function Ceiling() {
  const s = useSolo((st) => st);
  const { act2, revealTool } = s;
  return (
    <main className="screen">
      <p className="kicker">{S.ceiling.kicker}</p>
      <div className="huge">{S.ceiling.big}</div>
      <p>
        <strong>{S.ceiling.engineering(playerTested(s).length, s.engineeringRan ?? 0)}</strong>
      </p>
      <PlanBoard board={s.board} plan={s.plan} crewPlan={s.crewPlan} />
      <div className="stack">
        {S.ceiling.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <div className="panel">
        <StabilityMeter value={act2.length ? winRate(act2) : null} label={S.readout.actSoFar(act2.length)} showCeiling />
      </div>
      <CrewRadio />
      <div className="spacer" />
      <button className="btn btn--primary" onClick={revealTool}>
        {S.ceiling.go}
      </button>
    </main>
  );
}
