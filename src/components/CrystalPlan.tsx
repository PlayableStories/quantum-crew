// Act III's crystal plan (event mode), as a plan rather than a control: the card (two settings picked from a list,
// like an Act II plan's two directions), the read-only fan of a pair's four settings with each case's gap, the
// crystals' rule, the "Plan locked" stamp, the clue ladder and clue 2's hint. The numbers
// all come from src/shared/crystalPlan.ts (built on chsh.ts).
import type { ReactNode } from "react";
import { type Table, type TuningConfig } from "../shared/chsh.ts";
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import {
  CLUE_SETTINGS,
  CRYSTAL_RULE,
  RULE_GAPS,
  SETTINGS,
  clueAnswer,
  clueHint,
  planCases,
  settingGap,
  type LockedPlans,
  type PlanCase,
} from "../shared/crystalPlan.ts";
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
  like = false,
  className = "",
}: {
  title: ReactNode;
  value: TuningConfig;
  onChange?: (t: TuningConfig) => void;
  note?: ReactNode;
  cora?: boolean;
  /** The player's own card in event mode: "Like an Act II plan…" at the top. */
  like?: boolean;
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
      {like && <p className="crystal-plan__like">{P.like}</p>}
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
export function CrystalFan({ a, b, chances = false }: { a: TuningConfig; b: TuningConfig; chances?: boolean }) {
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
          <li key={`${c.x}${c.y}`} className={c.pWin >= SURVIVAL_THRESHOLD ? "fan__gap--good" : c.pWin < 0.5 ? "fan__gap--bad" : undefined}>
            <span>{caseName(c)}</span>{" "}
            <strong>{formatDeg(c.gap)}</strong>{" "}
            <span className="muted">
              {chances
                ? `· ${S.event.fan.chance(whole(c.pWin), c.need)}`
                : c.need === "same"
                  ? S.event.fan.needSame
                  : S.event.fan.needDiffer}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const caseName = (c: Pick<PlanCase, "x" | "y">) => S.event.fan.caseName(S.light[c.x], S.light[c.y]);

/** The crystals' rule (clue 1): each crystal alone is a coin flip; linked crystals land the same way more often the
 *  closer their settings (the gap table, from matchProbability); followed crystals make the pumps match exactly when
 *  they agree. `fold` = the note that a gap is never more than 90°. */
export function CrystalRuleTable({ fold = true, className = "" }: { fold?: boolean; className?: string }) {
  const R = S.event.crystalRule;
  const max = RULE_GAPS.at(-1)!;
  // An example of folding: the first and last of the eight settings.
  const [first, last] = [SETTINGS[0]!, SETTINGS.at(-1)!];
  return (
    <div className={`crystal-rule ${className}`}>
      <p>{R.coin}</p>
      <p>{R.closer}</p>
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
      {fold && (
        <p className="muted small">
          {R.fold(formatDeg(2 * max), formatDeg(max), formatDeg(first), formatDeg(last), formatDeg(settingGap(first, last)))}
        </p>
      )}
      <p>{R.follow}</p>
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

/** The clue 4 numbers, from the maths: the spacing, the match gaps, the differ gap and the rate. */
export function answerText() {
  const k = clueAnswer();
  const C = S.event.clues;
  const plan = (t: Table) => C.plan(t, formatDeg(CLUE_SETTINGS[t].greenDeg), formatDeg(CLUE_SETTINGS[t].redDeg));
  // A setting past 90° is the same as one below 0° (e.g. 157.5° and −22.5°).
  const over = [CLUE_SETTINGS.A, CLUE_SETTINGS.B].flatMap((t) => [t.greenDeg, t.redDeg]).find((d) => d > 90);
  return C.answer(
    formatDeg(k.spacing),
    plan("A"),
    plan("B"),
    over === undefined ? "" : C.sameSetting(formatDeg(over), formatDeg(over - 180)),
    formatDeg(k.matchGap),
    whole(k.same),
    formatDeg(k.differGap),
    whole(k.differ),
    rateText(k.rate),
  );
}

/** Clue 2 for one pair, in words: no wave yet, found it, or its weakest case and which way to move. `tv` = the TV
 *  lull's list form; the wave done's cards use `tvHint`. */
export function hintText(plans: LockedPlans, tv = false): string {
  const h = clueHint(plans);
  const C = S.event.clues;
  if (h.kind === "none") return C.noWave;
  if (h.kind === "found") return C.foundIt(whole(SURVIVAL_THRESHOLD));
  const w = h.weakest;
  return (tv ? C.listHint : C.hint)(caseName(w), formatDeg(w.gap), whole(w.pWin), w.need);
}

/** Clue 2 on a phone: one line for the player's own pair (a hint, or "Found it"). */
export function ClueHint({ plans }: { plans: LockedPlans }) {
  const h = clueHint(plans);
  return (
    <p className={`clue-hint clue-hint--${h.kind}`} role="status">
      {h.kind === "found" && "✓ "}
      {hintText(plans)}
    </p>
  );
}

/** Every clue released so far (`clue` 1–4), the latest last. Clue 2 lists `pairs` (each pair's weakest case). */
export function ClueList({
  clue,
  pairs,
  className = "",
  rule = true,
  titlesInline = false,
  tv = false,
}: {
  clue: number;
  pairs: { id: number; plans: LockedPlans }[];
  className?: string;
  /** Clue 1 in full (the rule); false where the rule already shows beside the clues (the TV's lull). */
  rule?: boolean;
  /** The TV: clue 2 lists only the pairs not yet at 80%, in the short form. */
  tv?: boolean;
  /** The TV: every clue's title on one line (the latest marked), then the latest clue in full. */
  titlesInline?: boolean;
}) {
  const C = S.event.clues;
  const items: { title: string; body: ReactNode }[] = [];
  if (clue >= 1)
    // The TV leaves out the 180° note (it's in the phones' Crystal rule sheet).
    items.push({ title: C.titles[0]!, body: rule ? <CrystalRuleTable fold={!tv} /> : null });
  if (clue >= 2) {
    // The TV lists the pairs not yet at 80% (the others found it); a phone shows its own pair.
    const shown = tv ? pairs.filter((p) => clueHint(p.plans).kind !== "found") : pairs;
    items.push({
      title: C.titles[1]!,
      body: (
        <ul className="clues__pairs">
          {shown.map((p) => (
            <li key={p.id}>
              {pairs.length > 1 && <strong>{C.weakestPair(p.id)}: </strong>}
              {hintText(p.plans, tv)}
            </li>
          ))}
          {tv && shown.length === 0 && <li>{C.foundIt(whole(SURVIVAL_THRESHOLD))}</li>}
        </ul>
      ),
    });
  }
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
