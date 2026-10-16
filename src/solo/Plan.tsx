// Act II strategy huddle (comms open): the player sets the whole joint plan, their own and the crewmate's, by name.
// They can test the pair over 1,000 rounds without live play; every test lands on the plan board.
import { PlanBoard } from "../components/PlanBoard.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { Rule } from "../components/Rule.tsx";
import { LightIcon } from "../components/SensorLight.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { winRate, type ClassicalStrategy } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { PLAN_IDS, planId, planOf } from "./plans.ts";
import { useSolo } from "./soloStore.ts";

export function Plan() {
  const s = useSolo((st) => st);
  const batches = s.act2Batches;
  return (
    <main className="screen">
      <p className="kicker">{S.plan.kicker}</p>
      <h1>{S.plan.title}</h1>
      <CrewRadio />
      <PlanChooser label={S.plan.you} value={s.plan} onChange={(p) => s.choosePlan("player", p)} />
      <PlanChooser label={S.plan.crew(S.crew.name)} value={s.crewPlan} onChange={(p) => s.choosePlan("crew", p)} />
      <button className="btn" onClick={s.runSimulation}>
        {S.plan.test}
        <small>{S.plan.testSub}</small>
      </button>
      {s.lastSim && <p className="panel" role="status">{S.plan.tested(pct(s.lastSim.winRate))}</p>}
      <PlanBoard board={s.board} plan={s.plan} crewPlan={s.crewPlan} />
      {batches > 0 && <p className="muted">{S.plan.last(pct(winRate(s.batch)))}</p>}
      <Rule diagram />
      <p className="muted small">{S.plan.blind}</p>
      <div className="spacer" />
      <button className="btn btn--primary" onClick={s.beginBatch}>
        {S.plan.start(batches + 1)}
      </button>
    </main>
  );
}

/** The four plans by name, each with what it does on COOL and on HOT. */
function PlanChooser({ label, value, onChange }: { label: string; value: ClassicalStrategy; onChange: (p: ClassicalStrategy) => void }) {
  const current = planId(value);
  return (
    <div className="panel stack">
      <p className="kicker">{label}</p>
      <div className="plans" role="radiogroup" aria-label={label}>
        {PLAN_IDS.map((id) => {
          const p = planOf(id);
          return (
            <button
              key={id}
              role="radio"
              aria-checked={current === id}
              aria-label={`${S.plans.name[id]}: ${S.plans.detail[id]}`}
              className={`btn plan-option ${current === id ? "btn--selected" : ""}`}
              onClick={() => onChange(p)}
            >
              <span>{S.plans.name[id]}</span>
              <span className="plan-option__detail" aria-hidden="true">
                <LightIcon light={COOL} />
                <PumpIcon pump={p.onGreen} />
                <LightIcon light={HOT} />
                <PumpIcon pump={p.onRed} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
