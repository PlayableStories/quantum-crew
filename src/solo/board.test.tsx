// The Act II screens (server-rendered, no browser): the huddle's two dialogue boxes, the readout's exact four-case
// view and luck line, the exact plan board on the engineering report, and the two-step intro.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { FourCases } from "../components/FourCases.tsx";
import { PlanBoard } from "../components/PlanBoard.tsx";
import { StabilityMeter } from "../components/StabilityMeter.tsx";
import { BATCH_SIZE, ROUND_MS } from "../config.ts";
import { classicalCases } from "../shared/chsh.ts";
import { CLOCKWISE } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { ALL_CELLS, PLAN_IDS, expectedBoard, planOf, type Board } from "./plans.ts";
import { Solo } from "./Solo.tsx";
import { luckLine, soloStore } from "./soloStore.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;
/** Copy as React writes it into markup. */
const esc = (text: string) => text.replace(/'/g, "&#x27;");

// Server rendering reads zustand's *initial* state snapshot; point it at the live state so the markup follows the game.
soloStore.getInitialState = soloStore.getState;

function finishBatch(act: () => void = () => {}) {
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

describe("four-case view", () => {
  it("matches expectedBoard() for all 16 plan pairs", () => {
    const exact = expectedBoard();
    for (const p of PLAN_IDS)
      for (const c of PLAN_IDS) {
        const cases = classicalCases(planOf(p), planOf(c));
        expect(cases).toHaveLength(4);
        expect(new Set(cases.map((k) => `${k.x}${k.y}`))).toEqual(new Set(["00", "01", "10", "11"]));
        const wins = cases.filter((k) => k.win).length;
        expect(wins / 4).toBe(exact[`${p}-${c}`]);
        const markup = renderToString(<FourCases plan={planOf(p)} crewPlan={planOf(c)} />);
        expect(count(markup, /class="case case--win"/g)).toBe(wins);
        expect(markup).toContain(S.readout.caseTotal(wins, `${(wins / 4) * 100}%`));
      }
  });

  it("each case shows the pump each side's plan gives", () => {
    // You: reverse when HOT; CORA: always clockwise. HOT/COOL: you anticlockwise, CORA clockwise, pumps fight.
    const markup = renderToString(<FourCases plan={planOf(1)} crewPlan={planOf(0)} />);
    expect(markup).toContain(S.outcome.spike.title);
    expect(count(markup, />ACW</g)).toBe(2);
  });
});

describe("stability gauge", () => {
  it("runs from 0% to 100%, with both ends labelled", () => {
    const markup = renderToString(<StabilityMeter value={0.75} label="x" showCeiling showLimit />);
    expect(markup).toContain(`>${S.meter.min}</span>`);
    expect(markup).toContain(`>${S.meter.max}</span>`);
    expect(markup).toContain("width:75%");
    expect(markup).toContain("left:80%");
    expect(markup).toMatch(/left:85\.35\d*%/);
  });
});

describe("luck line", () => {
  it("appears only when the batch reached 80% and the plan's true rate didn't", () => {
    expect(luckLine(10 / 12, 0.75)).toBe(true);
    expect(luckLine(0.8, 0.75)).toBe(true);
    expect(luckLine(9 / 12, 0.75)).toBe(false);
    expect(luckLine(10 / 12, 0.8)).toBe(false);
    expect(luckLine(0.5, 0.25)).toBe(false);
  });
});

describe("Act II screens", () => {
  beforeEach(() => s().reset());

  it("the intro opens on the station log, with the rule on the next step", () => {
    const markup = html();
    expect(count(markup, /<div class="steps"[^>]*>(<span[^>]*><\/span>){2}<\/div>/g)).toBe(1);
    expect(markup).toContain(esc(S.intro.lines[0]!));
    expect(markup).toContain(`>${S.intro.next}<`);
    expect(markup).not.toContain(S.intro.go);
    expect(markup).not.toContain(esc(S.rule.body));
  });

  it("the huddle: last chance to talk, two dialogue boxes, Lock in the plan, no test and no board", () => {
    s().start();
    const markup = html();
    expect(markup).toContain(S.plan.title);
    expect(markup).toContain(esc(S.plan.sub));
    expect(count(markup, /role="radiogroup"/g)).toBe(2);
    expect(count(markup, /role="radio"/g)).toBe(8);
    expect(count(markup, /aria-checked="true"/g)).toBe(2);
    expect(markup).toMatch(new RegExp(`${S.crew.name}<span class="ai-badge">`));
    expect(markup).toContain(`${S.plan.lock}<small>`);
    expect(markup).not.toContain("board__grid");
    expect(markup).not.toMatch(/Test this plan|1,000 rounds/);
    expect(markup).toContain("rule-chip");
  });

  it("the readout: no sampled test in Act II; the four-case button; the luck line only when it applies", () => {
    s().start();
    finishBatch(() => s().answer(CLOCKWISE, 0)); // always clockwise with CORA: true rate 75%
    expect(s().lastSim).toBeNull();
    s().runSimulation(); // ignored in Act II
    expect(s().lastSim).toBeNull();
    const markup = html();
    expect(markup).toMatch(/class="readout__hero"><div class="station[^"]*"/);
    expect(markup).toContain(S.readout.cases);
    expect(markup).not.toMatch(/1,000/);
    const batchRate = s().batch.filter((r) => r.win).length / BATCH_SIZE;
    expect(markup.includes(esc(S.readout.luck("75%")))).toBe(luckLine(batchRate, 0.75));
  });

  it("a perfect batch on a 75% plan shows the luck line", () => {
    s().start();
    // Win every round on purpose: CORA always pumps clockwise, so pick the pump the rule needs.
    finishBatch(() => {
      const r = s().round!;
      s().answer(((r.x & r.y) ^ CLOCKWISE) as 0 | 1, 0);
    });
    expect(s().batch.every((r) => r.win)).toBe(true);
    expect(html()).toContain(esc(S.readout.luck("75%")));
  });

  it("the board records a pair once it's been played, and engineering fills the rest exactly", () => {
    s().start();
    s().choosePlan("player", planOf(1));
    expect(s().board).toEqual({});
    finishBatch();
    expect(s().board).toEqual({ "1-0": { rate: 0.75, by: "player" } });
    s().reportCeiling();
    const exact = expectedBoard();
    for (const k of ALL_CELLS) expect(s().board[k]!.rate).toBe(exact[k]);
    expect(s().engineeringRan).toBe(15);
    expect(html()).toContain(S.ceiling.engineering(1, 15));
  });

  it("the engineering report: exact board, 75% as the true rate, no shift meter; the TV says the same", () => {
    s().start();
    finishBatch();
    s().reportCeiling();
    const markup = html();
    expect(markup).toContain("board--exact");
    expect(markup).toContain(esc(S.ceiling.truth));
    expect(markup).toContain(S.board.legendExact);
    expect(markup).not.toContain("Not on average");
    expect(markup).not.toContain(S.readout.actSoFar(BATCH_SIZE));
    expect(S.ceiling.lines[0]).not.toMatch(/not ever/i);
    expect(S.ceiling.lines[0]).toContain("exactly 75%");
    expect(S.ceiling.lines[0]).toContain("luck");
  });
});

describe("exact board", () => {
  it("whole percentages in every square; a corner mark only on engineering's; tried pairs named", () => {
    const board: Board = Object.fromEntries(ALL_CELLS.map((k) => [k, { rate: expectedBoard()[k], by: "engineering" as const }]));
    board["0-0"] = { rate: 0.75, by: "player" };
    const markup = renderToString(<PlanBoard board={board} plan={planOf(0)} crewPlan={planOf(0)} />);
    expect(count(markup, /<span>75%<\/span>/g)).toBe(8);
    expect(count(markup, /<span>25%<\/span>/g)).toBe(8);
    expect(markup).not.toContain("75.0%");
    expect(count(markup, /board__cell--eng/g)).toBe(15);
    expect(markup).toContain(S.board.cell(S.plans.name[0]!, S.plans.name[0]!, `${S.board.exact("75%")}, ${S.board.tried}`));
    expect(markup).not.toContain("<small>");
  });
});
