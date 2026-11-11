// Act III and the debrief (server-rendered, no browser): the crystal plan screen (since S3: event mode's card, CORA's
// fixed plan, the starting line, the live hint, the rule, engineering's answer after a failed wave), and the debrief's
// numbers in the side column.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { BATCH_SIZE, DEFAULT_TUNING, ROUND_MS } from "../config.ts";
import { Credits } from "../screens/Credits.tsx";
import { rateText } from "../components/CrystalPlan.tsx";
import { CLASSICAL_LIMIT, OPTIMAL_TUNING, QUANTUM_LIMIT } from "../shared/chsh.ts";
import { answerPlanFor, coraPlan, pairRateFor, planRate } from "../shared/crystalPlan.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { dialsRate, roundMs, soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const esc = (text: string) => text.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
/** The markup of the side column (between <aside> and the ActionBar). */
const side = (markup: string) => markup.slice(markup.indexOf("<aside"), markup.indexOf('class="action-bar"'));

// Server rendering reads zustand's *initial* state snapshot; point it at the live state so the markup follows the game.
soloStore.getInitialState = soloStore.getState;

function playBatch(act: () => void) {
  let now = 0;
  s().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
    act();
    now += ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

function toTuning() {
  toHuddle(s);
  playBatch(() => {});
  s().reportCeiling();
  s().revealTool();
  s().openTool();
}

describe("the crystal plan screen", () => {
  beforeEach(() => s().reset());

  it("your plan card (two lists, no dials), CORA's plan, the computed starting line, the live hint, the fan; no meter", () => {
    toTuning();
    const markup = html();
    expect(markup.match(/<select/g)).toHaveLength(2);
    expect(markup).not.toContain('class="dial ');
    expect(markup).toContain(esc(S.event.crystalPlan.like));
    expect(markup).toContain(esc(S.event.crystalPlan.coraSet));
    const rate = rateText(pairRateFor("A", DEFAULT_TUNING, coraPlan("B")));
    expect(rate).toBe("67.7%");
    expect(markup).toContain(esc(S.tuning.startCora("22.5°", "157.5°", rate)));
    expect(markup).toMatch(/CORA&#x27;s plan is fixed: (bring|move) your (COOL|HOT) setting/);
    expect(markup).not.toContain(esc(S.event.clues.liveRate(rate))); // the rate is in the starting line
    expect(markup).toContain(esc(S.tuning.nudge));
    expect(markup).toContain('class="fan"');
    expect(markup).toContain(`· ${S.event.fan.chance("85%", "same")}`);
    expect(markup).toContain(`>${S.tuning.start}<small>`);
    expect(markup).not.toContain('role="meter"');
  });

  it("the hint follows your setting, names only yours, and becomes Found it at 80%+", () => {
    toTuning();
    s().setTuning({ greenDeg: 0, redDeg: 90 });
    const moved = html();
    expect(moved).toMatch(/Your weakest case: A (COOL|HOT) · B (COOL|HOT)/);
    s().setTuning(OPTIMAL_TUNING.A);
    const found = html();
    expect(found).toContain(S.event.clues.foundIt("80%"));
    expect(found).not.toContain("Your weakest case");
  });

  it("the rule in full on the first visit, then behind a chip", () => {
    toTuning();
    expect(html()).toContain(esc(S.tuning.followRule));
    playBatch(() => {});
    s().nextBatch();
    const later = html();
    expect(later).not.toContain(esc(S.tuning.followRule));
    expect(later).toContain(`>${S.event.crystalRule.chip}</button>`);
  });

  it("Ask engineering for the answer: only after a wave that didn't pass; Use these settings gives 85.4% and passes", () => {
    toTuning();
    const button = `>${S.tuning.answerButton}</button>`;
    expect(html()).not.toContain(button);
    playBatch(() => {}); // the default plan, 67.7%: the gate doesn't pass
    s().nextBatch();
    expect(html()).toContain(button);
    s().useAnswer();
    expect(s().tuning).toEqual(answerPlanFor("A"));
    expect(dialsRate(s())).toBeCloseTo(QUANTUM_LIMIT, 12);
    playBatch(() => {});
    expect(s().act3Passed).toBe(true);
    s().nextBatch();
    expect(html()).toContain(button); // still offered (one wave failed), but the plan now passes
  });

  it("no button before a wave, and none after a passing first wave", () => {
    toTuning();
    s().setTuning(OPTIMAL_TUNING.A);
    playBatch(() => {});
    s().nextBatch();
    expect(html()).not.toContain(`>${S.tuning.answerButton}</button>`);
  });
});

describe("debrief", () => {
  beforeEach(() => s().reset());

  function toDebrief() {
    toTuning();
    playBatch(() => s().followCrystal(0));
    s().nextBatch();
    playBatch(() => s().followCrystal(0));
    s().startDebrief();
    s().openReport(); // the resolution, then the incident report
    expect(s().phase).toBe("debrief");
  }

  it("each step's numbers sit in the side column", () => {
    toDebrief();
    expect(side(html())).toContain(S.report.act2); // the incident report's three numbers
    s().setDebriefStep(1);
    expect(side(html())).toContain(S.debrief.compare.plan);
    s().setDebriefStep(2);
    expect(side(html())).toContain("bars");
  });

  it("who tested it (step 1) and no messages but a shared key (step 3), as in event mode", () => {
    toDebrief();
    const esc = (t: string) => t.replace(/'/g, "&#x27;");
    const clauser = S.debrief.steps[0]!.body.find((l) => l.startsWith("John Clauser, the C in CHSH"));
    expect(clauser).toBeDefined();
    expect(html()).toContain(esc(clauser!));
    s().setDebriefStep(2);
    expect(html()).toContain(esc(S.debrief.steps[2]!.body[2]!));
    expect(S.debrief.steps[2]!.body[2]).toMatch(/Quantum key distribution/);
  });

  it("the final step and /credits: short credits, the asset list behind a button", () => {
    toDebrief();
    s().setDebriefStep(S.debrief.steps.length - 1);
    for (const markup of [html(), renderToString(<Credits />)]) {
      expect(markup).toContain(S.credits.studio);
      expect(markup).toContain(S.credits.lead);
      expect(markup).toContain(S.credits.how);
      expect(markup).not.toContain('class="assets"');
      expect(markup).not.toContain("station-stability-0");
    }
  });
});

describe("the incident report's physics lines (S4)", () => {
  it("step 1 names local hidden variables; step 2 says the crystals (not the pumps) follow cos², and same settings score the classical limit", () => {
    const one = S.debrief.steps[0]!.body;
    expect(one[0]).toContain("Bell inequality. Physicists call a plan agreed in advance a local hidden-variable theory.");
    const two = S.debrief.steps[1]!.body.join(" ");
    expect(two).toContain("they give the same direction cos²(g) of the time");
    expect(two).not.toMatch(/pumps agree/);
    expect(two).not.toMatch(/Nobel/); // step 1 covers it
    const same = S.debrief.steps[1]!.body.find((l) => l.startsWith("At the same setting"))!;
    expect(same).toContain(`only ${CLASSICAL_LIMIT * 100}%`);
    for (const d of [0, 45, 157.5]) expect(planRate({ greenDeg: d, redDeg: d }, { greenDeg: d, redDeg: d })).toBeCloseTo(CLASSICAL_LIMIT, 12);
    const tsirelson = S.debrief.steps[1]!.body.findIndex((l) => l.includes("Tsirelson"));
    expect(S.debrief.steps[1]!.body[tsirelson - 1]).toBe(same);
  });

  it("CORA's Act II opening fits the plan boxes (no squares to tap)", () => {
    expect(S.crew.opening).not.toMatch(/square/);
    expect(S.crew.opening).toContain("pick both our plans");
  });
});

describe("solo's Act III wording", () => {
  /** Every string (and string-returning function, called with sample args) under a key. */
  const texts = (v: unknown): string[] =>
    typeof v === "string"
      ? [v]
      : typeof v === "function"
        ? [String((v as (...a: unknown[]) => unknown)("x", "y", "z"))]
        : v && typeof v === "object"
          ? Object.values(v).flatMap(texts)
          : [];

  it("no player-facing solo string in Act III, the resolution or the incident report says dial", () => {
    const keys = [S.pod, S.tuning, S.batch, S.readout, S.crew, S.resolution, S.report, S.debrief];
    for (const t of keys.flatMap(texts)) expect(t).not.toMatch(/\bdials?\b/i);
  });

  it("Act III rounds use solo's normal decision time", () => {
    expect(roundMs(3)).toBe(ROUND_MS);
    expect(roundMs(2)).toBe(ROUND_MS);
  });
});
