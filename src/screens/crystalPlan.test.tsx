// The crystal plan on a phone (server-rendered, no browser): a card of two settings picked from a list (no dial to
// turn), the partner's card live (CORA's read-only, with her own plan), the "like an Act II plan" line,
// the starting line computed from the maths, the read-only fan with each case's folded gap (and its chance from clue
// 2), clue 2's hint for the player's own pair, the round's chain (sensor → setting → the crystal, a coin flip) without
// MEASURE, and "Plan locked" on the plans in Act II and Act III rounds.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { AnswerRow, CrystalFan, CrystalPlanCard, CrystalRuleTable, ClueList, answerText, hintText, rateText } from "../components/CrystalPlan.tsx";
import { DEFAULT_TUNING } from "../config.ts";
import { OPTIMAL_TUNING, QUANTUM_LIMIT, matchProbability } from "../shared/chsh.ts";
import { CRYSTAL_RULE, answerPlanFor, coraPlan, pairRateFor, planRate } from "../shared/crystalPlan.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const html = () => renderToString(<Play />);

function act3(phase: RoomState["phase"], bot = false): RoomState {
  const s = room(phase, bot, 3);
  s.toolUnlocked = s.ceilingRevealed = true;
  s.clue = 1;
  if (bot) s.pairs[0] = { ...s.pairs[0]!, dials: { a: DEFAULT_TUNING, b: coraPlan("B") } };
  return s;
}

beforeEach(() => put({ round: null, flash: null, tuning: DEFAULT_TUNING }));

describe("the crystal plan card", () => {
  it("two rows, each a list of the eight settings; no dial to turn", () => {
    const markup = renderToString(<CrystalPlanCard title="Yours" value={DEFAULT_TUNING} onChange={() => {}} />);
    expect(markup.match(/<select/g)).toHaveLength(2);
    expect(markup.match(/<option/g)).toHaveLength(16);
    expect(markup).toContain(`aria-label="${esc(S.event.crystalPlan.row("COOL"))}"`);
    expect(markup).toContain(`aria-label="${esc(S.event.crystalPlan.row("HOT"))}"`);
    expect(markup).toContain(esc(S.event.crystalPlan.lead));
    expect(markup).not.toContain('class="dial');
  });

  it("read-only without onChange (the partner's, or CORA's)", () => {
    const markup = renderToString(<CrystalPlanCard title="CORA" value={coraPlan("B")} cora />);
    expect(markup).not.toContain("<select");
    expect(markup).toContain("22.5°");
    expect(markup).toContain("157.5°");
  });

  it("the first lull (clue 1): the like line, my card, the partner's live, the live hint with the pair's rate, the fan", () => {
    seat(act3("strategy"));
    const markup = html();
    expect(markup).toContain(esc(S.event.crystalPlan.like));
    expect(markup.match(/<select/g)).toHaveLength(2);
    expect(markup).toContain(esc(S.event.crystalPlan.partnerHead("Bo")));
    expect(markup).toContain(esc(S.event.clues.liveRate("75%")));
    expect(markup).toContain(esc(S.event.clues.hint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(markup).toContain('class="fan"');
    expect(markup).toContain(`>${S.event.clues.chip(1)}</button>`);
  });

  it("the hint is live: it follows the partner's plan with no wave played", () => {
    const s = act3("strategy");
    s.pairs[0] = { ...s.pairs[0]!, dials: { a: DEFAULT_TUNING, b: { greenDeg: 0, redDeg: 90 } } };
    seat(s);
    const markup = html();
    expect(s.stability.act3.rounds).toBe(0);
    expect(markup).not.toContain(esc(S.event.clues.hint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(markup).toContain("Your weakest case: A COOL · B HOT");
  });

  it("with CORA: the pair's computed rate, and the hint moves only the player's own setting", () => {
    seat(act3("strategy", true));
    const markup = html();
    const rate = rateText(pairRateFor("A", DEFAULT_TUNING, coraPlan("B")));
    expect(rate).toBe("67.7%");
    expect(markup).toContain(esc(S.event.clues.liveRate(rate)));
    expect(markup).toContain(esc(S.event.crystalPlan.coraSet));
    expect(markup).toMatch(/CORA&#x27;s plan is fixed: (bring|move) your (COOL|HOT) setting/);
    expect(markup).not.toContain("bring them closer");
    expect(markup).not.toContain("move them further apart");
  });
});

describe("the fan, the rule and the clues", () => {
  it("the fan folds each case's gap into 0°–90° (0° and 157.5° are 22.5° apart); nothing can be dragged", () => {
    const markup = renderToString(<CrystalFan a={{ greenDeg: 0, redDeg: 0 }} b={{ greenDeg: 157.5, redDeg: 90 }} />);
    const gaps = [...markup.matchAll(/<strong>([\d.]+)°<\/strong>/g)].map((m) => m[1]);
    expect(gaps).toEqual(["22.5", "90", "22.5", "90"]);
    expect(markup).not.toMatch(/<(input|select|button)/);
  });

  it("the fan shows gaps and same / differ only without chances; with them (from clue 1), each case's chance too", () => {
    const plans = { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B };
    const before = renderToString(<CrystalFan {...plans} />);
    expect(before).not.toMatch(/\d%/);
    const after = renderToString(<CrystalFan {...plans} chances />).replace(/<!-- -->/g, "");
    expect(after).toContain(`· ${S.event.fan.chance("85%", "same")}`);
    expect(after).toContain(`· ${S.event.fan.chance("85%", "differ")}`);
  });

  it("the crystals' rule: the coin flip, the gap table from matchProbability (100 / 85 / 50 / 15 / 0%), then following", () => {
    const markup = renderToString(<CrystalRuleTable />);
    expect(CRYSTAL_RULE.map((r) => r.same)).toEqual([0, 22.5, 45, 67.5, 90].map((g) => matchProbability(0, g)));
    for (const v of ["100%", "85%", "50%", "15%", "0%"]) expect(markup).toContain(`<td>${v}</td>`);
    const at = (t: string) => markup.indexOf(esc(t));
    expect(at(S.event.crystalRule.coin)).toBeGreaterThan(-1);
    expect(at(S.event.crystalRule.coin)).toBeLessThan(at(S.event.crystalRule.closer));
    expect(at(S.event.crystalRule.closer)).toBeLessThan(markup.indexOf("<table"));
    expect(markup.indexOf("</table>")).toBeLessThan(at(S.event.crystalRule.follow));
    expect(markup).toContain(esc(S.event.crystalRule.fold("180°", "90°", "0°", "157.5°", "22.5°")));
  });

  it("the rule and clue copy has no hard-coded percentages", () => {
    const strings = (v: unknown): string[] =>
      typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
    for (const t of [...strings(S.event.crystalRule), ...strings(S.event.clues), ...strings(S.event.fan)])
      expect(t).not.toMatch(/\d+(\.\d+)?%/);
    expect(S.remote.talk.clue.toString()).not.toMatch(/\d+(\.\d+)?%/);
  });

  it("clue 1 = the hint and the nudge; clue 2 = the answer (computed), its fan and the player's own row", () => {
    const plans = { a: DEFAULT_TUNING, b: DEFAULT_TUNING };
    const one = renderToString(<ClueList clue={1} pairs={[{ id: 1, plans }]} table="A" onUse={() => {}} />);
    expect(one).toContain(esc(S.event.clues.hint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(one).toContain(esc(S.event.clues.nudge));
    expect(one).not.toContain(S.event.clues.titles[1]!);
    const two = renderToString(<ClueList clue={2} pairs={[{ id: 1, plans }]} table="B" onUse={() => {}} />);
    expect(two).toContain(esc(answerText()));
    expect(two).toContain(esc(S.event.clues.yourRow("22.5°", "157.5°")));
    expect(two).toContain(`>${S.event.clues.useThese}</button>`);
    expect(two).toContain('class="fan"');
    expect(answerText()).toContain("22.5°");
    expect(answerText()).toContain("67.5°");
    expect(answerText()).toContain("85.4%");
    expect(answerText()).toContain(S.event.clues.sameSetting("157.5°", "-22.5°"));
  });
});

/** The button inside a rendered element tree (props-driven; no DOM needed). */
function findButton(node: unknown): { onClick: () => void } | null {
  if (!node || typeof node !== "object") return null;
  const el = node as { type?: unknown; props?: { onClick?: () => void; children?: unknown } };
  if (el.type === "button" && el.props?.onClick) return { onClick: el.props.onClick };
  const kids = el.props?.children;
  for (const k of Array.isArray(kids) ? kids : [kids]) {
    const b = findButton(k);
    if (b) return b;
  }
  return null;
}

describe("clue 1 and 2 on a phone", () => {
  const withPlans = (clue: number, dials: { a: typeof DEFAULT_TUNING; b: typeof DEFAULT_TUNING }) => {
    const s = act3("strategy");
    s.clue = clue;
    s.pairs[0] = { ...s.pairs[0]!, dials };
    return s;
  };

  it("a pair at 80%+ sees Found it live in the lull, no hint and no button", () => {
    put({ tuning: OPTIMAL_TUNING.A });
    seat(withPlans(2, { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B }));
    const markup = html();
    expect(markup).toContain(S.event.clues.foundIt("80%"));
    expect(markup).not.toContain("Your weakest case");
    expect(markup).not.toContain(`>${S.event.clues.useThese}</button>`);
  });

  it("clue 0: no hint, no Clues chip, and the fan shows no chances", () => {
    seat(withPlans(0, { a: DEFAULT_TUNING, b: DEFAULT_TUNING }));
    const markup = html();
    expect(markup).not.toContain("Your weakest case");
    expect(markup).not.toContain(S.event.clues.chip(0));
    expect(markup).not.toContain(`· ${S.event.fan.chance("100%", "same")}`);
  });

  it("from clue 1 the fan shows each case's chance", () => {
    seat(withPlans(1, { a: DEFAULT_TUNING, b: DEFAULT_TUNING }));
    expect(html()).toContain(`· ${S.event.fan.chance("100%", "same")}`);
  });

  it("clue 2 below 80%: the own row and Use these settings in the lull; the chip counts 2", () => {
    seat(withPlans(2, { a: DEFAULT_TUNING, b: DEFAULT_TUNING }));
    const markup = html();
    expect(markup).toContain(esc(S.event.clues.yourRow("0°", "45°")));
    expect(markup).toContain(`>${S.event.clues.useThese}</button>`);
    expect(markup).toContain(`>${S.event.clues.chip(2)}</button>`);
  });

  it("Use these settings sets exactly the player's own row; with both rows the pair holds 85.4%", () => {
    const used: Record<string, typeof DEFAULT_TUNING> = {};
    for (const table of ["A", "B"] as const) {
      const btn = findButton(AnswerRow({ table, plans: { a: DEFAULT_TUNING, b: DEFAULT_TUNING }, onUse: (t) => (used[table] = t) }));
      btn!.onClick();
    }
    expect(used).toEqual({ A: answerPlanFor("A"), B: answerPlanFor("B") });
    expect(planRate(used.A!, used.B!)).toBeCloseTo(QUANTUM_LIMIT, 12);
    // With CORA at B, A's row completes her fixed plan.
    expect(planRate(used.A!, coraPlan("B"))).toBeCloseTo(QUANTUM_LIMIT, 12);
  });
});

describe("rounds: the chain and the plan badge", () => {
  it("Act III: sensor → your plan's setting → the crystal's direction, no MEASURE, no locked banner", () => {
    const s = act3("round");
    s.pairs[0] = { ...s.pairs[0]!, lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } };
    seat(s);
    put({ round: { roundId: "2-1", act: 3, light: 1, ms: 3500, dialDeg: 45, answered: null, partner: null, crystal: 1 } });
    const markup = html();
    expect(markup).toContain(S.event.chain.sensor);
    const text = markup.replace(/<!-- -->/g, "");
    // One line: HOT → your plan: 45° → the crystal says ANTICLOCKWISE (this time; …), and no dial (U1).
    const line = /<p class="chain__line">(.*?)<\/p>/.exec(text)?.[1] ?? "";
    const words = line.replace(/<[^>]+>/g, "");
    expect(words).toBe(`${S.light[1]} → ${S.event.chain.plan} 45° → ${S.event.chain.crystal} ${S.pump[1]} ${S.event.chain.flip}`);
    expect(markup).not.toMatch(/class="dial/);
    expect(markup).not.toMatch(/aria-label="45°"/);
    expect(markup).not.toContain(`>${S.batch.measure}<`);
    // U1: no separate locked banner in Act III (the chain names the setting in use); the CRYSTAL tag stays.
    expect(markup).not.toContain(S.planBadge.stamp);
    expect(markup).not.toContain("locked-plan");
    expect(markup).toContain(`>${S.batch.crystalTag}</span>`);
  });

  it("Act II: the locked plans carry the badge", () => {
    const s = room("round", false, 2);
    s.pairs[0] = { ...s.pairs[0]!, locked: { a: { onGreen: 0, onRed: 1 }, b: { onGreen: 0, onRed: 0 } } };
    seat(s);
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: 3500, dialDeg: null, answered: null, partner: null, crystal: null } });
    expect(html()).toContain(S.planBadge.stamp);
  });
});
