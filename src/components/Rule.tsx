import { RingDiagram } from "./RingDiagram.tsx";
import { S } from "../strings.ts";

/** The station rule, always on screen while planning: the mechanism first, then the quick reference. */
export function Rule({ diagram = false }: { diagram?: boolean }) {
  return (
    <div className="panel rule">
      <p className="kicker">{S.rule.head}</p>
      {diagram && <RingDiagram />}
      <p>{S.rule.body}</p>
      <p className="muted small">{S.rule.vent}</p>
      <p className="rule__quick">{S.rule.quick}</p>
    </div>
  );
}
