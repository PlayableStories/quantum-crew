// Act III's crystal plan (event mode), as a plan rather than a control: the card (two settings picked from a list,
// like an Act II plan's two directions), the read-only fan of a pair's four settings with each case's gap, the
// crystals' rule table, the comparison with an Act II plan, the "Plan locked" stamp and the clue ladder. The numbers
// all come from src/shared/crystalPlan.ts (built on chsh.ts).
import type { ReactNode } from "react";
import { matchProbability, type Table, type TuningConfig } from "../shared/chsh.ts";
import { CLUE_SETTINGS, CRYSTAL_RULE, SETTINGS, planCases, planRate, weakestCase, type PlanCase } from "../shared/crystalPlan.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { AiBadge } from "./AiBadge.tsx";
import { formatDeg } from "./Dial.tsx";
import { LightIcon } from "./SensorLight.tsx";

const whole = (p: number) => `${Math.round(p * 100)}%`;
/** An exact rate: whole when it is ("75%"), else to one decimal ("67.7%"). */
export const rateText = (p: number) => {
  const v = Math.round(p * 1000) / 10;
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
};
const P = S.event.crystalPlan;

/** The player's crystal plan: one setting per sensor reading, each picked from the eight settings. `onChange`
 *  missing = read-only (the partner's card, or CORA's). */
export function CrystalPlanCard({
  title,
  value,
  onChange,
  note,
  cora = false,
  className = "",
}: {
  title: ReactNode;
  value: TuningConfig;
  onChange?: (t: TuningConfig) => void;
  note?: ReactNode;
  cora?: boolean;
  className?: string;
}) {
  const row = (light: 0 | 1, field: "greenDeg" | "redDeg") => (
    <div className="crystal-plan__row">
      <span className="crystal-plan__when">
        <LightIcon light={light} />
        <strong>{S.light[light]}</strong>
      </span>
      {onChange ? (
        <select
          className="crystal-plan__select"
          aria-label={P.row(S.light[light])}
          value={String(value[field])}
          onChange={(e) => onChange({ ...value, [field]: Number(e.target.value) })}
        >
          {SETTINGS.map((deg) => (
            <option key={deg} value={String(deg)}>
              {formatDeg(deg)}
            </option>
          ))}
        </select>
      ) : (
        <strong className="crystal-plan__value">{formatDeg(value[field])}</strong>
      )}
    </div>
  );
  return (
    <div className={`panel crystal-plan ${onChange ? "" : "crystal-plan--readonly"} ${className}`}>
      <p className="kicker crystal-plan__title">
        {title}
        {cora && <AiBadge />}
      </p>
      <p className="muted crystal-plan__lead">{P.lead}</p>
      <div className="crystal-plan__rows">
        {row(COOL, "greenDeg")}
        {row(HOT, "redDeg")}
      </div>
      {note && <p className="muted small crystal-plan__note">{note}</p>}
    </div>
  );
}

/** A plan in one line: "COOL 0° · HOT 45°". */
export const planLine = (t: TuningConfig) => P.line(formatDeg(t.greenDeg), formatDeg(t.redDeg));

/** The fan: Table A's and Table B's settings on a half-circle (θ and θ + 180° are the same measurement), and the gap
 *  in each of the four cases. Read-only. */
export function CrystalFan({ a, b }: { a: TuningConfig; b: TuningConfig }) {
  const marks = [
    { key: "AC", table: "A", light: COOL, deg: a.greenDeg },
    { key: "AH", table: "A", light: HOT, deg: a.redDeg },
    { key: "BC", table: "B", light: COOL, deg: b.greenDeg },
    { key: "BH", table: "B", light: HOT, deg: b.redDeg },
  ] as const;
  const R = 40;
  const at = (deg: number, r: number) => ({ x: -r * Math.cos((deg * Math.PI) / 180), y: -r * Math.sin((deg * Math.PI) / 180) });
  // Marks on the same setting sit at different radii so all four stay visible.
  const seen = new Map<number, number>();
  return (
    <div className="fan" role="group" aria-label={S.event.fan.label}>
      <svg viewBox="-58 -54 116 62" className="fan__svg" aria-hidden="true">
        <path className="fan__arc" d={`M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0`} />
        <line className="fan__base" x1={-R - 6} y1={0} x2={R + 6} y2={0} />
        {marks.map((m) => {
          const n = seen.get(m.deg) ?? 0;
          seen.set(m.deg, n + 1);
          const tip = at(m.deg, R - n * 9);
          const label = at(m.deg, R + 9 - n * 9 - (n ? 4 : 0));
          return (
            <g key={m.key} className={`fan__mark fan__mark--${m.light === HOT ? "hot" : "cool"}`}>
              <line x1={0} y1={0} x2={tip.x} y2={tip.y} />
              <circle cx={tip.x} cy={tip.y} r={2.6} />
              {n === 0 && (
                <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                  {formatDeg(m.deg)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="fan__gaps">
        {planCases(a, b).map((c) => (
          <li key={`${c.x}${c.y}`} className={c.pWin >= 0.8 ? "fan__gap--good" : c.pWin < 0.5 ? "fan__gap--bad" : undefined}>
            <span>{caseName(c)}</span>{" "}
            <strong>{formatDeg(c.gap)}</strong>{" "}
            <span className="muted">{c.need === "same" ? S.event.fan.needSame : S.event.fan.needDiffer}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const caseName = (c: Pick<PlanCase, "x" | "y">) => S.event.fan.caseName(S.light[c.x], S.light[c.y]);

/** The crystals' rule: the chance of the same direction for each gap (from matchProbability). */
export function CrystalRuleTable({ compact = false }: { compact?: boolean }) {
  const R = S.event.crystalRule;
  return (
    <div className={`crystal-rule ${compact ? "crystal-rule--compact" : ""}`}>
      {!compact && <p>{R.body}</p>}
      <table className="crystal-rule__table">
        <thead>
          <tr>
            <th scope="row">{R.gap}</th>
            {CRYSTAL_RULE.map((r) => (
              <th key={r.gap} scope="col">
                {formatDeg(r.gap)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{R.same}</th>
            {CRYSTAL_RULE.map((r) => (
              <td key={r.gap}>{whole(r.same)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {!compact && <p className="muted small">{R.fold}</p>}
    </div>
  );
}

/** The first time: a crystal plan beside an Act II plan (same conditions; a setting instead of a direction). */
export function CompareWithPlan() {
  const C = S.event.compare;
  return (
    <div className="plan-compare">
      <p className="kicker">{C.head}</p>
      <table className="plan-compare__table">
        <thead>
          <tr>
            {C.cols.map((c, i) => (i === 0 ? <td key={i} /> : <th key={c} scope="col">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {C.rows.map(([head, act2, act3]) => (
            <tr key={head}>
              <th scope="row">{head}</th>
              <td>{act2}</td>
              <td>{act3}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The stamp on a plan once the wave has started. */
export function LockedPlan({ children }: { children: ReactNode }) {
  return (
    <div className="locked-plan" role="status">
      <span className="locked-plan__stamp">🔒 {S.event.locked.stamp}</span>
      <span className="locked-plan__body">{children}</span>
    </div>
  );
}

/** The clue 4 numbers, from the maths: the match gaps, the differ gap and the rate. */
export function answerText() {
  const cases = planCases(CLUE_SETTINGS.A, CLUE_SETTINGS.B);
  const match = cases.find((c) => c.need === "same")!;
  const differ = cases.find((c) => c.need === "differ")!;
  const C = S.event.clues;
  const plan = (t: Table) => C.plan(t, formatDeg(CLUE_SETTINGS[t].greenDeg), formatDeg(CLUE_SETTINGS[t].redDeg));
  return C.answer(
    plan("A"),
    plan("B"),
    formatDeg(match.gap),
    whole(matchProbability(0, match.gap)),
    formatDeg(differ.gap),
    whole(1 - matchProbability(0, differ.gap)),
    `${(planRate(CLUE_SETTINGS.A, CLUE_SETTINGS.B) * 100).toFixed(1)}%`,
  );
}

/** Clue 2 for one pair: its weakest case with its gap and what it needs (from its latest locked plans). */
export function weakestText(plans: { a: TuningConfig; b: TuningConfig }) {
  const w = weakestCase(plans.a, plans.b);
  return S.event.clues.weakest(caseName(w), formatDeg(w.gap), whole(w.pWin), w.need);
}

/** Every clue released so far (`clue` 1–4), the latest last. Clue 2 lists `pairs` (each pair's weakest case). */
export function ClueList({
  clue,
  pairs,
  className = "",
  ruleTable = true,
  titlesInline = false,
}: {
  clue: number;
  pairs: { id: number; plans: { a: TuningConfig; b: TuningConfig } | null }[];
  className?: string;
  /** The TV's lull shows the rule's table beside the clues, so clue 1 leaves it out there. */
  ruleTable?: boolean;
  /** The TV: every clue's title on one line (the latest marked), then the latest clue in full. */
  titlesInline?: boolean;
}) {
  const C = S.event.clues;
  const items: { title: string; body: ReactNode }[] = [];
  if (clue >= 1)
    items.push({ title: C.titles[0]!, body: <>{ruleTable && <CrystalRuleTable compact />}<p>{C.question}</p></> });
  if (clue >= 2)
    items.push({
      title: C.titles[1]!,
      body: (
        <ul className="clues__pairs">
          {pairs.map((p) => (
            <li key={p.id}>
              {pairs.length > 1 && <strong>{C.weakestPair(p.id)}: </strong>}
              {p.plans ? weakestText(p.plans) : C.noWave}
            </li>
          ))}
        </ul>
      ),
    });
  if (clue >= 3) items.push({ title: C.titles[2]!, body: <p>{C.nudge}</p> });
  if (clue >= 4) items.push({ title: C.titles[3]!, body: <p>{answerText()}</p> });
  if (titlesInline) {
    const latest = items.at(-1);
    return (
      <div className={`clues ${className}`}>
        <p className="kicker clues__titles">
          {items.map((it, i) => (
            <span key={it.title} className={i === items.length - 1 ? "clues__title--latest" : undefined}>
              {i + 1}. {it.title}
            </span>
          ))}
        </p>
        {latest && <div className="clues__item clues__item--latest">{latest.body}</div>}
      </div>
    );
  }
  return (
    <ol className={`clues ${className}`}>
      {items.map((it, i) => (
        <li key={it.title} className={`clues__item ${i === items.length - 1 ? "clues__item--latest" : ""}`}>
          <p className="kicker">
            {i + 1}. {it.title}
          </p>
          {it.body}
        </li>
      ))}
    </ol>
  );
}
