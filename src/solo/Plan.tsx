// Act II strategy huddle (comms open): the last chance to talk before a batch. Two dialogue boxes, one for the
// player and one for CORA: the player picks a plan in each, CORA confirms hers on the radio, and "Lock in the plan"
// starts the batch (comms go dark until it ends). No tests here: the plan's exact rate is shown after the batch.
import { CrewName } from "../components/AiBadge.tsx";
import { PlanBox } from "../components/PlanBox.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { winRate } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { nextWave, useSolo } from "./soloStore.ts";

export function Plan() {
  const s = useSolo((st) => st);
  const batches = s.act2Batches;
  return (
    <ScreenLayout
      header={<p className="kicker">{S.plan.kicker}</p>}
      side={
        <>
          <CrewRadio />
          {batches > 0 && <p className="muted">{S.plan.last(pct(winRate(s.batch)))}</p>}
          <RuleChip />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={s.beginBatch}>
          {S.plan.lock}
          <small>{S.plan.lockSub(nextWave(s))}</small>
        </button>
      }
    >
      <div className="huddle__head">
        <h1>{S.plan.title}</h1>
        <p className="muted">{S.plan.sub}</p>
      </div>
      <div className="plan-boxes">
        <PlanBox title={S.plan.you} label={S.plan.yourBox} value={s.plan} onChange={(p) => s.choosePlan("player", p)} />
        <PlanBox
          title={<CrewName />}
          label={S.plan.box(S.crew.name)}
          crew
          value={s.crewPlan}
          onChange={(p) => s.choosePlan("crew", p)}
        />
      </div>
    </ScreenLayout>
  );
}
