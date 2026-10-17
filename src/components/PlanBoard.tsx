// The Act II plan board: your four plans (rows) against the crewmate's four (columns).
// - Huddle (`onSelect`): the board is the plan chooser. Every cell is a button; tapping one sets both plans. Only the
//   selected cell is a Tab stop and the arrow keys move between cells (roving focus).
// - Results: a tested cell shows its 1,000-round result, by you or (after the engineering report) by engineering,
//   which gets a corner mark.
// - `exact` (engineering report): every cell shows its exact rate (75% or 25%) with your own test small underneath.
import { useRef, useState, type KeyboardEvent } from "react";
import type { ClassicalStrategy } from "../shared/chsh.ts";
import { PLAN_IDS, cellKey, expectedBoard, moveCell, planOf, type Board, type CellKey, type PlanId } from "../solo/plans.ts";
import { S } from "../strings.ts";
import { pct } from "./StabilityMeter.tsx";

type Props = {
  board: Board;
  plan: ClassicalStrategy;
  crewPlan: ClassicalStrategy;
  onSelect?: (player: PlanId, crew: PlanId) => void;
  exact?: boolean;
  className?: string;
};

const EXACT = expectedBoard();

export function PlanBoard({ board, plan, crewPlan, onSelect, exact = false, className = "" }: Props) {
  const current = cellKey(plan, crewPlan);
  const [focusKey, setFocusKey] = useState<CellKey>(current);
  const buttons = useRef(new Map<CellKey, HTMLButtonElement>());
  const tabStop = onSelect && buttons.current.has(focusKey) ? focusKey : current;

  const onKey = (k: CellKey) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = moveCell(k, e.key);
    if (!next) return;
    e.preventDefault();
    setFocusKey(next);
    buttons.current.get(next)?.focus();
  };

  return (
    <div className={`panel board ${exact ? "board--exact" : ""} ${className}`}>
      <p className="kicker">{exact ? S.board.headExact : onSelect ? S.board.headChoose : S.board.head}</p>
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
                const shown = exact ? EXACT[k] : cell?.rate;
                const mine = cell?.by === "player";
                const eng = cell?.by === "engineering";
                const cls = [
                  "board__cell",
                  shown === undefined ? "board__cell--blank" : shown >= 0.5 ? "board__cell--high" : "board__cell--low",
                  eng ? "board__cell--eng" : "",
                  k === current ? "board__cell--current" : "",
                ].join(" ");
                const value =
                  shown === undefined
                    ? S.board.untested
                    : exact
                      ? [S.board.exact(pct(shown)), mine ? S.board.yourTest(pct(cell.rate)) : "", eng ? S.board.engRun : ""]
                          .filter(Boolean)
                          .join(", ")
                      : [pct(shown), eng ? S.board.engRun : ""].filter(Boolean).join(", ");
                const label = S.board.cell(S.plans.name[p]!, S.plans.name[c]!, value);
                const content = (
                  <>
                    {shown !== undefined && <span>{pct(shown)}</span>}
                    {exact && mine && <small>{S.board.yourTestShort(pct(cell.rate))}</small>}
                  </>
                );
                return (
                  <td key={c}>
                    {onSelect ? (
                      <button
                        ref={(el) => {
                          if (el) buttons.current.set(k, el);
                          else buttons.current.delete(k);
                        }}
                        type="button"
                        className={cls}
                        aria-label={label}
                        aria-pressed={k === current}
                        tabIndex={k === tabStop ? 0 : -1}
                        onClick={() => onSelect(p, c)}
                        onKeyDown={onKey(k)}
                        onFocus={() => setFocusKey(k)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={cls} role="img" aria-label={label}>
                        {content}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {exact && <p className="muted small">{S.board.legendExact}</p>}
    </div>
  );
}
