// Act II strategy huddle (comms open): the player sets the whole joint plan, their own and the crewmate's, by tapping
// a square on the plan board (row = your plan, column = the crewmate's). They can test the pair over 1,000 rounds
// without live play; every test lands on the board.
import { PlanBoard } from "../components/PlanBoard.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { LightIcon } from "../components/SensorLight.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { winRate, type ClassicalStrategy } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { planId, planOf, type PlanId } from "./plans.ts";
import { useSolo } from "./soloStore.ts";

export function Plan() {
  const s = useSolo((st) => st);
  const batches = s.act2Batches;
  // A tap sets both plans; tell the store only about the side(s) that changed, so the crewmate answers the change.
  const select = (p: PlanId, c: PlanId) => {
    if (p !== planId(s.plan)) s.choosePlan("player", planOf(p));
    if (c !== planId(s.crewPlan)) s.choosePlan("crew", planOf(c));
  };
  return (
    <ScreenLayout
      header={<p className="kicker">{S.plan.kicker}</p>}
      side={
        <>
          <p className="panel pair-line">
            <PairSide who={S.batch.you} plan={s.plan} />
            <PairSide who={S.batch.crewmate} plan={s.crewPlan} />
          </p>
          <button className="btn btn--compact" onClick={s.runSimulation}>
            {S.plan.test}
            <small>{S.plan.testSub}</small>
          </button>
          {s.lastSim && (
            <p className="muted small" role="status">
              {S.plan.tested(pct(s.lastSim.winRate))}
            </p>
          )}
          {batches > 0 && <p className="muted">{S.plan.last(pct(winRate(s.batch)))}</p>}
          <RuleChip />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={s.beginBatch}>
          {S.plan.start(batches + 1)}
          <small>{S.plan.blind}</small>
        </button>
      }
    >
      <h1 className="hide-on-phone">{S.plan.title}</h1>
      <CrewRadio />
      <PlanBoard board={s.board} plan={s.plan} crewPlan={s.crewPlan} onSelect={select} className="board--chooser" />
    </ScreenLayout>
  );
}

/** "You: Reverse when HOT ❄↻ 🔥↺": one side of the selected pair, with what it does on COOL and on HOT. */
function PairSide({ who, plan }: { who: string; plan: ClassicalStrategy }) {
  const id = planId(plan);
  return (
    <span className="pair-line__side">
      <span className="muted">{S.plan.side(who)}</span>
      <strong>{S.plans.name[id]}</strong>
      <span className="plan-icons" role="img" aria-label={S.plans.detail[id]}>
        <LightIcon light={COOL} />
        <PumpIcon pump={plan.onGreen} />
        <LightIcon light={HOT} />
        <PumpIcon pump={plan.onRed} />
      </span>
    </span>
  );
}
