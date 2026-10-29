// End of Act II: the wall is named. Engineering fills in every plan the crew didn't test, and the board turns to
// exact rates: every cell is 75% or 25%, none beats 75%. Still no physics words; those wait for the debrief.
import { PlanBoard } from "../components/PlanBoard.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { playerTried, useSolo } from "./soloStore.ts";

export function Ceiling() {
  const s = useSolo((st) => st);
  return (
    <ScreenLayout
      header={<p className="kicker">{S.ceiling.kicker}</p>}
      side={
        <>
          <p>{S.ceiling.truth}</p>
          <CrewRadio />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={s.revealTool}>
          {S.ceiling.go}
        </button>
      }
    >
      <div className="ceiling__top">
        <div className="huge">{S.ceiling.big}</div>
        <p>
          <strong>{S.ceiling.engineering(playerTried(s).length, s.engineeringRan ?? 0)}</strong>
        </p>
      </div>
      <PlanBoard board={s.board} plan={s.plan} crewPlan={s.crewPlan} className="board--hero" />
    </ScreenLayout>
  );
}
