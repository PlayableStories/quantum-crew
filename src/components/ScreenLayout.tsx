// The frame every solo screen sits in: a header row (the screen's kicker on the left, the mute toggle on the right),
// the main content, an optional side column and the screen's buttons in a sticky ActionBar.
// Portrait or narrow: one column, stacked head → main → side → actions. Landscape and ≥ 900px wide, with a side:
// two columns (main | side), the actions at the bottom of the side column. Breakpoint in styles.css (Layout).
import type { ReactNode } from "react";
import type { SoundContext } from "../audio/sfx.ts";
import { ActionBar } from "./ActionBar.tsx";
import { MuteToggle } from "./MuteToggle.tsx";

type Props = {
  header?: ReactNode;
  children: ReactNode;
  side?: ReactNode;
  actions?: ReactNode;
  mute?: SoundContext;
  className?: string;
};

export function ScreenLayout({ header, children, side, actions, mute = "solo", className = "" }: Props) {
  const cls = ["screen", "layout", side ? "layout--split" : "", actions ? "layout--bar" : "", className];
  return (
    <main className={cls.filter(Boolean).join(" ")}>
      <header className="layout__head">
        <div className="layout__title">{header}</div>
        <MuteToggle where={mute} />
      </header>
      <div className="layout__main">{children}</div>
      {side && <aside className="layout__side">{side}</aside>}
      {actions && <ActionBar>{actions}</ActionBar>}
    </main>
  );
}
