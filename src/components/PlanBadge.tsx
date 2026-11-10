// "Plan locked" (U1): the one plan reminder in an Act II round's header (solo and event phones), beside the PLAN tag on
// the planned pump. The plans were agreed openly in the lull, so a tap shows both; they aren't a sentence on screen.
import { useCallback, useState } from "react";
import type { ClassicalStrategy } from "../shared/chsh.ts";
import { S } from "../strings.ts";
import { Sheet } from "./Sheet.tsx";

export function PlanBadge({ mine, partner, theirs }: { mine: ClassicalStrategy; partner: string; theirs: ClassicalStrategy }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const B = S.planBadge;
  return (
    <>
      <button
        type="button"
        className="btn btn--ghost plan-badge"
        aria-haspopup="dialog"
        aria-label={B.open}
        onClick={() => setOpen(true)}
      >
        {`🔒 ${B.stamp}`}
      </button>
      <Sheet open={open} onClose={close} label={B.head}>
        {/* Mounted only while open, so the round itself never shows the plans as text. */}
        {open && (
          <div className="stack">
            <p className="kicker">{B.head}</p>
            <ul className="plan-badge__rows">
              <li>{B.row(B.you, mine)}</li>
              <li>{B.row(partner, theirs)}</li>
            </ul>
          </div>
        )}
      </Sheet>
    </>
  );
}
