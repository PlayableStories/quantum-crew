// Act II strategy huddle (comms open): the last chance to talk before a batch. Two dialogue boxes, one for the
// player and one for CORA: the player picks a plan in each, CORA confirms hers on the radio, and "Lock in the plan"
// starts the batch (comms go dark until it ends). No tests here: the plan's exact rate is shown after the batch.
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { CrewName } from "../components/AiBadge.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { LightIcon } from "../components/SensorLight.tsx";
import { pct } from "../components/StabilityMeter.tsx";
import { winRate, type ClassicalStrategy } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { PLAN_IDS, planId, planOf, type PlanId } from "./plans.ts";
import { useSolo } from "./soloStore.ts";

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
          <small>{S.plan.lockSub(batches + 1)}</small>
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

type BoxProps = {
  title: ReactNode;
  label: string;
  value: ClassicalStrategy;
  onChange: (p: ClassicalStrategy) => void;
  crew?: boolean;
};

/** One dialogue box: the four plans as a radio group (arrow keys move and select, like native radios). */
function PlanBox({ title, label, value, onChange, crew = false }: BoxProps) {
  const current = planId(value);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const next = ((current + step + PLAN_IDS.length) % PLAN_IDS.length) as PlanId;
    onChange(planOf(next));
    buttons.current[next]?.focus();
  };
  return (
    <div className={`panel plan-box ${crew ? "plan-box--crew" : ""}`}>
      <p className="kicker plan-box__title">{title}</p>
      <div className="plan-box__options" role="radiogroup" aria-label={label} onKeyDown={onKey}>
        {PLAN_IDS.map((id) => {
          const p = planOf(id);
          const on = current === id;
          return (
            <button
              key={id}
              ref={(el) => {
                buttons.current[id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${S.plans.name[id]}: ${S.plans.detail[id]}`}
              tabIndex={on ? 0 : -1}
              className={`btn plan-option ${on ? "btn--selected" : ""}`}
              onClick={() => onChange(p)}
            >
              <span>{S.plans.name[id]}</span>
              <span className="plan-icons" aria-hidden="true">
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
