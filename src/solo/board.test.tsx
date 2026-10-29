// The Act II screens after Phase 2 (server-rendered, no browser): the plan board as the huddle's chooser, its exact
// mode on the engineering report, the two-step intro and the readout's one-line board note.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { PlanBoard } from "../components/PlanBoard.tsx";
import { BATCH_SIZE, ROUND_MS } from "../config.ts";
import { S } from "../strings.ts";
import { ALL_CELLS, moveCell, planOf, type Board } from "./plans.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;
/** Copy as React writes it into markup. */
const esc = (text: string) => text.replace(/'/g, "&#x27;");

// Server rendering reads zustand's *initial* state snapshot; point it at the live state so the markup follows the game.
soloStore.getInitialState = soloStore.getState;

function finishBatch() {
  let now = 0;
  s().beginBatch();
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
    now += ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

describe("board keyboard movement", () => {
  it("arrow keys move one square and stop at the edges", () => {
    expect(moveCell("0-0", "ArrowDown")).toBe("1-0");
    expect(moveCell("0-0", "ArrowRight")).toBe("0-1");
    expect(moveCell("2-3", "ArrowLeft")).toBe("2-2");
    expect(moveCell("2-3", "ArrowUp")).toBe("1-3");
    expect(moveCell("0-0", "ArrowUp")).toBeNull();
    expect(moveCell("3-3", "ArrowRight")).toBeNull();
    expect(moveCell("1-1", "Enter")).toBeNull();
  });
});

describe("plan board as the huddle's chooser", () => {
  const render = (board: Board = {}) =>
    renderToString(<PlanBoard board={board} plan={planOf(1)} crewPlan={planOf(0)} onSelect={() => {}} />);

  it("every square is a button named after both plans; the selected one is pressed and is the only Tab stop", () => {
    const markup = render({ "1-0": { rate: 0.745, by: "player" } });
    expect(count(markup, /<button[^>]*class="board__cell/g)).toBe(16);
    expect(count(markup, /aria-pressed="true"/g)).toBe(1);
    expect(count(markup, /tabindex="0"/g)).toBe(1);
    const selected = markup.match(/<button[^>]*aria-pressed="true"[^>]*>/)![0];
    expect(selected).toContain(S.board.cell(S.plans.name[1]!, S.plans.name[0]!, "74.5%"));
    expect(selected).toContain('tabindex="0"');
    expect(markup).toContain(S.board.cell(S.plans.name[3]!, S.plans.name[2]!, S.board.untested));
  });

  it("the huddle shows the board as the chooser and no separate plan panels", () => {
    s().reset();
    s().start();
    const markup = html();
    expect(count(markup, /<button[^>]*class="board__cell/g)).toBe(16);
    expect(markup).not.toContain("plan-option");
    expect(markup).toContain("pair-line");
    expect(markup).toContain(S.plans.name[0]);
    // The comms-dark note is the Start button's subtitle, and the full rule card is a chip.
    expect(markup).toMatch(new RegExp(`${S.plan.start(1)}<small>${esc(S.plan.blind)}</small>`));
    expect(markup).toContain("rule-chip");
    expect(markup).not.toContain('class="panel rule"');
  });
});

describe("exact board on the engineering report", () => {
  it("shows 75% or 25% in every square, your own test small underneath, and a corner mark only on engineering's", () => {
    const board: Board = Object.fromEntries(ALL_CELLS.map((k) => [k, { rate: 0.5, by: "engineering" as const }]));
    board["0-0"] = { rate: 0.762, by: "player" };
    const markup = renderToString(<PlanBoard board={board} plan={planOf(0)} crewPlan={planOf(0)} exact />);
    expect(count(markup, /<span>75%<\/span>/g)).toBe(8);
    expect(count(markup, /<span>25%<\/span>/g)).toBe(8);
    expect(markup).not.toContain("75.0%");
    expect(markup).toContain(`<small>${S.board.yourTestShort("76.2%")}</small>`);
    expect(count(markup, /board__cell--eng/g)).toBe(15);
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain(">ENG<");
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

  it("the readout puts the station behind the headline and the board in one line", () => {
    s().start();
    finishBatch();
    s().runSimulation();
    const markup = html();
    expect(markup).toMatch(/class="readout__hero"><div class="station[^"]*"/);
    expect(markup).toContain(S.readout.added(""));
    expect(markup).not.toContain("board__grid");
  });

  it("the engineering report: exact board, 75% as the true rate, no shift meter; the TV says the same", () => {
    s().start();
    finishBatch();
    s().reportCeiling();
    const markup = html();
    expect(markup).toContain("board--exact");
    expect(markup).toContain(esc(S.ceiling.truth));
    expect(markup).not.toContain("Not on average");
    expect(markup).not.toContain(S.readout.actSoFar(BATCH_SIZE));
    // The TV says the same: 75% is the exact rate, anything above it in a batch is luck.
    expect(S.ceiling.lines[0]).not.toMatch(/not ever/i);
    expect(S.ceiling.lines[0]).toContain("exactly 75%");
    expect(S.ceiling.lines[0]).toContain("luck");
  });
});
