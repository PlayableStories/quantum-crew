// One dialogue box of Act II plans: the four named plans as a radio group (arrow keys move and select, like native
// radios). Solo's lull has two (yours and CORA's); an event phone's lull has one, for the player's own plan.
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { ClassicalStrategy } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { PLAN_IDS, planId, planOf, type PlanId } from "../shared/plans.ts";
import { S } from "../strings.ts";
import { PumpIcon } from "./PumpIcon.tsx";
import { LightIcon } from "./SensorLight.tsx";

type BoxProps = {
  title: ReactNode;
  label: string;
  value: ClassicalStrategy;
  onChange: (p: ClassicalStrategy) => void;
  crew?: boolean;
  className?: string;
};

/** One dialogue box: the four plans as a radio group (arrow keys move and select, like native radios). */
export function PlanBox({ title, label, value, onChange, crew = false, className = "" }: BoxProps) {
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
    <div className={`panel plan-box ${crew ? "plan-box--crew" : ""}${className ? ` ${className}` : ""}`}>
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
