// The Act II plan board on the engineering report: your four plans (rows) against CORA's four (columns), every
// square at its exact rate (75% or 25%). Pairs the player tried (locked in and played) are plain; engineering's have
// a corner mark. The pair played last is outlined.
import type { ClassicalStrategy } from "../shared/chsh.ts";
import { PLAN_IDS, cellKey, expectedBoard, planOf, type Board } from "../solo/plans.ts";
import { S } from "../strings.ts";

type Props = { board: Board; plan: ClassicalStrategy; crewPlan: ClassicalStrategy; className?: string };

const EXACT = expectedBoard();
/** Exact rates are whole numbers (every square is 75% or 25%). */
const whole = (rate: number) => `${Math.round(rate * 100)}%`;

export function PlanBoard({ board, plan, crewPlan, className = "" }: Props) {
  const current = cellKey(plan, crewPlan);
  return (
    <div className={`panel board board--exact ${className}`}>
      <p className="kicker">{S.board.headExact}</p>
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
                const rate = EXACT[k];
                const by = board[k]?.by;
                const cls = [
                  "board__cell",
                  rate >= 0.5 ? "board__cell--high" : "board__cell--low",
                  by === "engineering" ? "board__cell--eng" : "",
                  k === current ? "board__cell--current" : "",
                ].join(" ");
                const value = [S.board.exact(whole(rate)), by === "player" ? S.board.tried : by ? S.board.engRun : ""]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <td key={c}>
                    <div className={cls} role="img" aria-label={S.board.cell(S.plans.name[p]!, S.plans.name[c]!, value)}>
                      <span>{whole(rate)}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{S.board.legendExact}</p>
    </div>
  );
}
