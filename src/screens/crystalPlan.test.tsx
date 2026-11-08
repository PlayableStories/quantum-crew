// The crystal plan on a phone (server-rendered, no browser): a card of two settings picked from a list (no dial to
// turn), the partner's card live (CORA's read-only, with her own plan), the "like an Act II plan" line,
// the starting line computed from the maths, the read-only fan with each case's folded gap (and its chance from clue
// 2), clue 2's hint for the player's own pair, the round's chain (sensor → setting → the crystal, a coin flip) without
// MEASURE, and "Plan locked" on the plans in Act II and Act III rounds.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CrystalFan, CrystalPlanCard, CrystalRuleTable, ClueList, answerText, hintText, rateText } from "../components/CrystalPlan.tsx";
import { DEFAULT_TUNING } from "../config.ts";
import { OPTIMAL_TUNING, matchProbability } from "../shared/chsh.ts";
import { CRYSTAL_RULE, coraPlan, pairRateFor } from "../shared/crystalPlan.ts";
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

  it("the first lull: the like line, my card, the partner's live, the 75% starting line and the fan", () => {
    seat(act3("strategy"));
    const markup = html();
    expect(markup).toContain(esc(S.event.crystalPlan.like));
    expect(markup).not.toContain("plan-compare");
    expect(markup.match(/<select/g)).toHaveLength(2);
    expect(markup).toContain(esc(S.event.crystalPlan.partnerHead("Bo")));
    expect(markup).toContain(esc(S.event.crystalPlan.startHumans("75%")));
    expect(markup).toContain('class="fan"');
    expect(markup).toContain(`>${S.event.clues.chip(1)}</button>`);
  });

  it("the starting line goes once a plan moves", () => {
    const s = act3("strategy");
    s.stability.act3 = { rounds: 8, wins: 6, timeouts: 0 };
    s.pairs[0] = { ...s.pairs[0]!, dials: { a: DEFAULT_TUNING, b: { greenDeg: 22.5, redDeg: 0 } } };
    seat(s);
    const markup = html();
    expect(markup).not.toContain(esc(S.event.crystalPlan.startHumans("75%")));
  });

  it("with CORA: her settings and the pair's computed rate with my plan, and her card says she set her own", () => {
    seat(act3("strategy", true));
    const markup = html();
    const rate = rateText(pairRateFor("A", DEFAULT_TUNING, coraPlan("B")));
    expect(rate).toBe("67.7%");
    expect(markup).toContain(esc(S.event.crystalPlan.startCora("22.5°", "157.5°", rate)));
    expect(markup).toContain(esc(S.event.crystalPlan.coraSet));
  });
});

describe("the fan, the rule and the clues", () => {
  it("the fan folds each case's gap into 0°–90° (0° and 157.5° are 22.5° apart); nothing can be dragged", () => {
    const markup = renderToString(<CrystalFan a={{ greenDeg: 0, redDeg: 0 }} b={{ greenDeg: 157.5, redDeg: 90 }} />);
    const gaps = [...markup.matchAll(/<strong>([\d.]+)°<\/strong>/g)].map((m) => m[1]);
    expect(gaps).toEqual(["22.5", "90", "22.5", "90"]);
    expect(markup).not.toMatch(/<(input|select|button)/);
  });

  it("before clue 2 the fan shows gaps and same / differ only; from clue 2, each case's chance too", () => {
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

  it("clues stack up; clue 1 is the rule; clue 2 the pair's hint; clue 4 gives the settings and 85.4%", () => {
    const one = renderToString(<ClueList clue={1} pairs={[{ id: 1, plans: null }]} />);
    expect(one).toContain(esc(S.event.crystalRule.coin));
    expect(one).not.toContain(S.event.clues.titles[1]!);
    const four = renderToString(<ClueList clue={4} pairs={[{ id: 1, plans: { a: DEFAULT_TUNING, b: DEFAULT_TUNING } }]} />);
    expect(four).toContain(esc(S.event.clues.hint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(four).toContain(esc(S.event.clues.nudge));
    expect(answerText()).toContain(S.event.clues.sameSetting("157.5°", "-22.5°"));
    expect(answerText()).toContain("22.5°");
    expect(answerText()).toContain("67.5°");
    expect(answerText()).toContain("85.4%");
    expect(answerText()).toContain(`COOL ${OPTIMAL_TUNING.B.greenDeg}°, HOT ${OPTIMAL_TUNING.B.redDeg}°`);
  });
});

describe("clue 2 on a phone: a hint for pairs not yet at 80%", () => {
  const withPlans = (clue: number, plans: { a: typeof DEFAULT_TUNING; b: typeof DEFAULT_TUNING }) => {
    const s = act3("strategy");
    s.clue = clue;
    s.stability.act3 = { rounds: 8, wins: 6, timeouts: 0 };
    s.pairs[0] = { ...s.pairs[0]!, lockedDials: plans, dials: plans };
    return s;
  };

  it("a pair below 80% sees its weakest case (both HOT at 0°: further apart); the starting line gives way", () => {
    seat(withPlans(2, { a: DEFAULT_TUNING, b: DEFAULT_TUNING }));
    const markup = html();
    expect(markup).toContain(esc(S.event.clues.hint("A HOT · B HOT", "0°", "0%", "differ")));
    expect(markup).not.toContain(esc(S.event.crystalPlan.startHumans("75%")));
    expect(markup).toContain(`· ${S.event.fan.chance("100%", "same")}`);
  });

  it("a match case as the weakest: bring them closer", () => {
    // A COOL 0°, HOT 90°; B COOL 45°, HOT 45°: the weakest is a match case.
    const plans = { a: { greenDeg: 0, redDeg: 90 }, b: { greenDeg: 45, redDeg: 135 } };
    const text = hintText(plans);
    expect(text).toContain("bring them closer");
  });

  it("a pair at 80%+ sees Found it, no hint", () => {
    seat(withPlans(2, { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B }));
    const markup = html();
    expect(markup).toContain(S.event.clues.foundIt("80%"));
    expect(markup).not.toContain("Your weakest case");
  });

  it("before clue 2: no hint, and the fan shows no chances", () => {
    seat(withPlans(1, { a: DEFAULT_TUNING, b: DEFAULT_TUNING }));
    const markup = html();
    expect(markup).not.toContain("Your weakest case");
    expect(markup).not.toContain(`· ${S.event.fan.chance("100%", "same")}`);
  });
});

describe("rounds: the chain and Plan locked", () => {
  it("Act III: sensor → your plan's setting → the crystal's direction, no MEASURE, and the plan locked", () => {
    const s = act3("round");
    s.pairs[0] = { ...s.pairs[0]!, lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } };
    seat(s);
    put({ round: { roundId: "2-1", act: 3, light: 1, ms: 3500, dialDeg: 45, answered: null, partner: null, crystal: 1 } });
    const markup = html();
    expect(markup).toContain(S.event.chain.sensor);
    const text = markup.replace(/<!-- -->/g, "");
    expect(text).toContain(`${S.event.chain.plan} <strong>45°</strong>`);
    expect(text).toContain(`${S.event.chain.crystal} <strong>${S.pump[1]}</strong> <span class="muted small chain__flip">${esc(S.event.chain.flip)}</span>`);
    expect(markup).not.toContain(`>${S.batch.measure}<`);
    expect(markup).toContain(S.event.locked.stamp);
    expect(markup).toContain(S.event.locked.act3("0°", "45°"));
  });

  it("Act II: the locked plans carry the stamp", () => {
    const s = room("round", false, 2);
    s.pairs[0] = { ...s.pairs[0]!, locked: { a: { onGreen: 0, onRed: 1 }, b: { onGreen: 0, onRed: 0 } } };
    seat(s);
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: 3500, dialDeg: null, answered: null, partner: null, crystal: null } });
    expect(html()).toContain(S.event.locked.stamp);
  });
});
