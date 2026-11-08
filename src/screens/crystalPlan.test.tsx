// The crystal plan on a phone (server-rendered, no browser): a card of two settings picked from a list (no dial to
// turn), the partner's card live (CORA's read-only, with her own plan), the first-time comparison with an Act II plan,
// the starting line computed from the maths, the read-only fan with each case's folded gap, the round's chain
// (sensor → setting → the crystal) without MEASURE, and "Plan locked" on the plans in Act II and Act III rounds.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CrystalFan, CrystalPlanCard, CrystalRuleTable, ClueList, answerText, rateText } from "../components/CrystalPlan.tsx";
import { DEFAULT_TUNING } from "../config.ts";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import { coraPlan, pairRateFor } from "../shared/crystalPlan.ts";
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

  it("the first lull: the comparison, my card, the partner's live, the 75% starting line and the fan", () => {
    seat(act3("strategy"));
    const markup = html();
    expect(markup).toContain(S.event.compare.head);
    expect(markup.match(/<select/g)).toHaveLength(2);
    expect(markup).toContain(esc(S.event.crystalPlan.partnerHead("Bo")));
    expect(markup).toContain(esc(S.event.crystalPlan.startHumans("75%")));
    expect(markup).toContain('class="fan"');
    expect(markup).toContain(`>${S.event.clues.chip(1)}</button>`);
  });

  it("after the first wave the comparison moves into the Crystal rule sheet; the starting line goes once a plan moves", () => {
    const s = act3("strategy");
    s.stability.act3 = { rounds: 8, wins: 6, timeouts: 0 };
    s.pairs[0] = { ...s.pairs[0]!, dials: { a: DEFAULT_TUNING, b: { greenDeg: 22.5, redDeg: 0 } } };
    seat(s);
    const markup = html();
    expect(markup).not.toContain(S.event.compare.head);
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

  it("the crystals' rule: 100 / 85 / 50 / 15 / 0% for gaps 0–90°", () => {
    const markup = renderToString(<CrystalRuleTable />);
    for (const v of ["100%", "85%", "50%", "15%", "0%"]) expect(markup).toContain(`<td>${v}</td>`);
  });

  it("clues stack up; clue 2 names the pair's weakest case; clue 4 gives the settings and 85.4%", () => {
    const one = renderToString(<ClueList clue={1} pairs={[{ id: 1, plans: null }]} />);
    expect(one).toContain(S.event.clues.question);
    expect(one).not.toContain(S.event.clues.titles[1]!);
    const four = renderToString(<ClueList clue={4} pairs={[{ id: 1, plans: { a: DEFAULT_TUNING, b: DEFAULT_TUNING } }]} />);
    expect(four).toContain(S.event.clues.question);
    expect(four).toContain(esc(S.event.clues.weakest("A HOT · B HOT", "0°", "0%", "differ")));
    expect(four).toContain(esc(S.event.clues.nudge));
    expect(answerText()).toContain("22.5°");
    expect(answerText()).toContain("67.5°");
    expect(answerText()).toContain("85.4%");
    expect(answerText()).toContain(`COOL ${OPTIMAL_TUNING.B.greenDeg}°, HOT ${OPTIMAL_TUNING.B.redDeg}°`);
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
    expect(text).toContain(`${S.event.chain.crystal} <strong>${S.pump[1]}</strong>`);
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
