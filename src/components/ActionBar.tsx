import type { ReactNode } from "react";

/**
 * A screen's buttons. Portrait: sticky at the bottom of the viewport, above the iPhone home indicator; it stays in
 * the page flow, so nothing scrolls behind it. Landscape (ScreenLayout with a side): the bottom of the side column.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}
