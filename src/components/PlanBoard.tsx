// The Act II plan board: your four plans (rows) against the crewmate's four (columns). A cell shows its 1,000-round
// result once tested, by you or (after the engineering report) by engineering. The current joint plan is outlined.
import type { ClassicalStrategy } from "../shared/chsh.ts";
import { PLAN_IDS, cellKey, planOf, type Board } from "../solo/plans.ts";
import { S } from "../strings.ts";
import { pct } from "./StabilityMeter.tsx";

type Props = { board: Board; plan: ClassicalStrategy; crewPlan: ClassicalStrategy };

export function PlanBoard({ board, plan, crewPlan }: Props) {
  const current = cellKey(plan, crewPlan);
  return (
    <div className="panel board">
      <p className="kicker">{S.board.head}</p>
      <table className="board__grid">
        <thead>
          <tr>
            <th className="board__corner" scope="col">
              <span>{S.board.rows} ↓</span>
              <br />
              {S.board.cols} →
            </th>
            {PLAN_IDS.map((c) => (
              <th key={c} scope="col">
                {S.plans.short[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_IDS.map((p) => (
            <tr key={p}>
              <th scope="row">{S.plans.short[p]}</th>
              {PLAN_IDS.map((c) => {
                const k = cellKey(planOf(p), planOf(c));
                const cell = board[k];
                const value = cell ? pct(cell.rate) : S.board.untested;
                const cls = [
                  "board__cell",
                  cell ? (cell.rate >= 0.5 ? "board__cell--high" : "board__cell--low") : "board__cell--blank",
                  cell?.by === "engineering" ? "board__cell--eng" : "",
                  k === current ? "board__cell--current" : "",
                ].join(" ");
                return (
                  <td key={c} className={cls} aria-label={S.board.cell(S.plans.name[p]!, S.plans.name[c]!, value)}>
                    {cell && <span>{pct(cell.rate)}</span>}
                    {cell?.by === "engineering" && <small>{S.board.eng}</small>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{S.board.legend}</p>
    </div>
  );
}
