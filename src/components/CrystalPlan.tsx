// Act III's crystal plan (event mode), as a plan rather than a control: the card (two settings picked from a list,
// like an Act II plan's two directions), the read-only fan of a pair's four settings with each case's gap, the
// crystals' rule, the "Plan locked" stamp, the clue ladder and clue 2's hint. The numbers
// all come from src/shared/crystalPlan.ts (built on chsh.ts).
import type { ReactNode } from "react";
import { type Light, type Table, type TuningConfig, type Valve } from "../shared/chsh.ts";
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import {
  CLUE_SETTINGS,
  CRYSTAL_RULE,
  RULE_GAPS,
  SETTINGS,
  answerPlanFor,
  clueAnswer,
  clueHint,
  moverFor,
  planCases,
  settingGap,
  type LockedPlans,
  type PlanCase,
} from "../shared/crystalPlan.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import type { PairInfo } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { AiBadge } from "./AiBadge.tsx";
import { formatDeg } from "../lib/formatDeg.ts";
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
  lead = true,
  className = "",
}: {
  title: ReactNode;
  value: TuningConfig;
  onChange?: (t: TuningConfig) => void;
  note?: ReactNode;
  cora?: boolean;
  /** The player's own card in event mode: "Like an Act II plan…" at the top. */
  like?: boolean;
  /** The "When your sensor reads…" line (solo leaves it off CORA's card: it isn't the reader's sensor). */
  lead?: boolean;
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
      {lead && <p className="muted crystal-plan__lead">{P.lead}</p>}
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
export function CrystalRuleTable({
  fold = true,
  className = "",
  follow,
}: {
  fold?: boolean;
  className?: string;
  /** Line 3 in other words (solo names CORA); event mode's by default. */
  follow?: string;
}) {
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
      <p>{follow ?? R.follow}</p>
    </div>
  );
}

/** An Act III round (event phones and solo), in one line: your sensor → your plan's setting for it → the crystal's
 *  direction (a coin flip this time), then the keys. */
export function CrystalChain({ light, dialDeg, crystal }: { light: Light; dialDeg: number; crystal: Valve }) {
  const C = S.event.chain;
  return (
    <div className="chain" role="status">
      <p className="chain__line">
        <span className={`chain__sensor chain__sensor--${light === HOT ? "hot" : "cool"}`}>
          <LightIcon light={light} />
          <strong>{S.light[light]}</strong>
        </span>
        {" → "}
        {C.plan} <strong>{formatDeg(dialDeg)}</strong>
        {" → "}
        <span className="chain__crystal">
          {C.crystal} <strong>{S.pump[crystal]}</strong>
        </span>{" "}
        <span className="muted small chain__flip">{C.flip}</span>
      </p>
      <span className="muted small crystal-keys">{S.batch.follow}</span>
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

/** The human in a pair with CORA (her plan is fixed, so the hint names only their setting); null for two players. */
export type HumanWithCora = { table: Table; name: string } | null;

/** A room pair's human beside CORA, if one seat is hers. */
export function humanWithCora(pair: Pick<PairInfo, "a" | "b">): HumanWithCora {
  if (pair.a.playerId === null && pair.b.playerId !== null) return { table: "B", name: pair.b.name };
  if (pair.b.playerId === null && pair.a.playerId !== null) return { table: "A", name: pair.a.name };
  return null;
}

/** Clue 1 for one pair, in words: found it, or its weakest case and which way to move. `tv` = the TV lull's list form
 *  (the wave done's cards use `tvHint`). */
export function hintText(plans: LockedPlans, tv = false, human: HumanWithCora = null): string {
  const h = clueHint(plans);
  const C = S.event.clues;
  if (h.kind === "none") return "";
  if (h.kind === "found") return C.foundIt(whole(SURVIVAL_THRESHOLD));
  const w = h.weakest;
  const args = [caseName(w), formatDeg(w.gap), whole(w.pWin), w.need] as const;
  if (human) {
    const mine = S.light[moverFor(w, human.table)];
    return tv ? C.coraListHint(human.name, ...args, mine) : C.coraHint(...args, mine);
  }
  return (tv ? C.listHint : C.hint)(...args);
}

/** Clue 1 on a phone: the pair's live rate, then its hint (or "Found it"). Follows the plans as they change. */
export function ClueHint({
  plans,
  human = null,
  rate = true,
}: {
  plans: LockedPlans;
  human?: HumanWithCora;
  /** Lead with the pair's live rate (solo shows it in its starting line instead). */
  rate?: boolean;
}) {
  const h = clueHint(plans);
  if (h.kind === "none") return null;
  return (
    <p className={`clue-hint clue-hint--${h.kind}`} role="status">
      {rate && `${S.event.clues.liveRate(rateText(h.rate))} `}
      {h.kind === "found" && "✓ "}
      {hintText(plans, false, human)}
    </p>
  );
}

/** Clue 2 on a phone: the player's own row of the answer, and (while the pair is under 80%) a button that fills it in
 *  on their crystal plan card. */
export function AnswerRow({ table, plans, onUse }: { table: Table; plans: LockedPlans; onUse?: (t: TuningConfig) => void }) {
  const row = answerPlanFor(table);
  const done = clueHint(plans).kind === "found";
  return (
    <div className="answer-row" role="status">
      <strong>{S.event.clues.yourRow(formatDeg(row.greenDeg), formatDeg(row.redDeg))}</strong>
      {onUse && !done && (
        <button type="button" className="btn btn--primary answer-row__use" onClick={() => onUse(row)}>
          {S.event.clues.useThese}
        </button>
      )}
    </div>
  );
}

/** Clue 2 on the TV's wave done, in one line: both rows and the rate. */
export function answerOutText() {
  const C = S.event.clues;
  const plan = (t: Table) => C.plan(t, formatDeg(CLUE_SETTINGS[t].greenDeg), formatDeg(CLUE_SETTINGS[t].redDeg));
  return C.answerOut(plan("A"), plan("B"), rateText(clueAnswer().rate));
}

/** Every clue released so far (`clue` 1–2), the latest last. Clue 1 = the hint (live) and the nudge: on the TV every
 *  pair's, on a phone its own pair's. Clue 2 = the answer and its fan; on a phone, the player's own row too. */
export function ClueList({
  clue,
  pairs,
  className = "",
  titlesInline = false,
  tv = false,
  table,
  onUse,
}: {
  clue: number;
  pairs: { id: number; plans: LockedPlans; human?: HumanWithCora }[];
  className?: string;
  /** The TV: every clue's title on one line (the latest marked), then the latest clue in full. */
  titlesInline?: boolean;
  tv?: boolean;
  /** A phone: the player's table (their row of the answer) and the button's action. */
  table?: Table;
  onUse?: (t: TuningConfig) => void;
}) {
  const C = S.event.clues;
  const items: { title: string; body: ReactNode }[] = [];
  if (clue >= 1)
    items.push({
      title: C.titles[0]!,
      body: (
        <>
          {tv ? (
            <ul className="clues__pairs">
              {pairs.map((p) => {
                const h = clueHint(p.plans);
                if (h.kind === "none") return null;
                return (
                  <li key={p.id} className={h.kind === "found" ? "clues__pair--found" : undefined}>
                    <strong>{C.pairRate(p.id, rateText(h.rate))}: </strong>
                    {h.kind === "found" && "✓ "}
                    {hintText(p.plans, true, p.human ?? null)}
                  </li>
                );
              })}
            </ul>
          ) : (
            pairs.map((p) => <ClueHint key={p.id} plans={p.plans} human={p.human ?? null} />)
          )}
          <p className="clues__nudge">{C.nudge}</p>
        </>
      ),
    });
  if (clue >= 2)
    items.push({
      title: C.titles[1]!,
      body: (
        <div className="clues__answer">
          <p>{answerText()}</p>
          {!tv && table && <AnswerRow table={table} plans={pairs[0]?.plans ?? null} onUse={onUse} />}
          <CrystalFan a={CLUE_SETTINGS.A} b={CLUE_SETTINGS.B} chances />
        </div>
      ),
    });
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
