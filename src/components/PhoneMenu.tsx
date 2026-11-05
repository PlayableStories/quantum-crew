// The phone's small "⋯" menu (event mode): leaving the game lives here, not as a full-width button players took for
// "continue". Leaving asks first, in a dialog where staying is the primary action, and says what actually happens:
// the seat stays the player's and CORA covers it until they rejoin with the same name and table.
import { useCallback, useState } from "react";
import { S } from "../strings.ts";
import { Sheet } from "./Sheet.tsx";

export function PhoneMenu({ partner, onLeave }: { partner: { name: string; cora: boolean } | null; onLeave: () => void }) {
  const [open, setOpen] = useState<"menu" | "confirm" | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const M = S.phone.menu;
  return (
    <>
      <button type="button" className="btn btn--ghost phone-menu__btn" aria-haspopup="dialog" aria-label={M.open} onClick={() => setOpen("menu")}>
        ⋯
      </button>
      {/* One sheet whose content moves from the menu to the confirmation: two sheets would close one another (the
          first one's close event lands after the switch). */}
      <Sheet open={open !== null} onClose={close} label={open === "confirm" ? M.confirmTitle : M.open}>
        {open === "confirm" ? (
          <div className="stack">
            <p className="kicker">{M.confirmTitle}</p>
            <p>{!partner || partner.cora ? M.confirmAlone : M.confirmPartner(partner.name)}</p>
            <button type="button" className="btn btn--primary" onClick={close}>
              {M.stay}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onLeave}>
              {M.leaveNow}
            </button>
          </div>
        ) : (
          <div className="stack">
            <button type="button" className="btn" onClick={() => setOpen("confirm")}>
              {M.leave}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
