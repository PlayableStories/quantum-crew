import { useCallback, useState } from "react";
import { S } from "../strings.ts";
import { Rule } from "./Rule.tsx";
import { Sheet } from "./Sheet.tsx";

/** The quick rule in one line; "Explain" opens the full station rule card, with the ring diagram, in a Sheet. */
export function RuleChip() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="rule-chip">
      <p className="rule-chip__text">{S.rule.quick}</p>
      <button className="btn btn--ghost rule-chip__btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {S.rule.explain}
      </button>
      <Sheet open={open} onClose={close} label={S.rule.head}>
        <Rule diagram />
      </Sheet>
    </div>
  );
}
