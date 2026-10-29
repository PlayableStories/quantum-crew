// Act III and the debrief after Phase 3 (server-rendered, no browser): tuning with your dials first, the crewmate's
// as one locked line, the hint and the asset list behind Sheet buttons, and the debrief's numbers in the side column.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { BATCH_SIZE, ROUND_MS } from "../config.ts";
import { Credits } from "../screens/Credits.tsx";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
const esc = (text: string) => text.replace(/'/g, "&#x27;");
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
  s().start();
  playBatch(() => {});
  s().reportCeiling();
  s().revealTool();
  s().openTool();
}

describe("tuning", () => {
  beforeEach(() => s().reset());

  it("your dials first and full size; the crewmate's as one locked line; rule chip; no meter", () => {
    toTuning();
    const markup = html();
    const main = markup.slice(markup.indexOf('class="layout__main"'), markup.indexOf("<aside"));
    expect(main).toContain(S.tuning.yours);
    expect(main.match(/class="dial "/g)).toHaveLength(2);
    expect(side(markup)).toContain(S.crew.dialsLine("22.5°", "157.5°"));
    expect(side(markup)).toContain(S.crew.seeDials);
    expect(markup).toContain("rule-chip");
    expect(markup).not.toContain('class="panel rule"');
    expect(markup).not.toContain('role="meter"');
    // The locked dials live in a closed Sheet.
    expect(markup).not.toContain("dials--locked");
  });

  it("the hint button appears only once a hint is available; the hint itself stays in the closed Sheet", () => {
    toTuning();
    const button = `>${S.tuning.hintButton}</button>`;
    expect(html()).not.toContain(button);
    playBatch(() => {}); // every round times out: a batch under 80%, always
    s().nextBatch();
    expect(s().phase).toBe("act3Plan");
    const markup = html();
    expect(markup).toContain(button);
    expect(markup).not.toContain(esc(S.tuning.hint));
  });
});

describe("debrief", () => {
  beforeEach(() => s().reset());

  function toDebrief() {
    toTuning();
    playBatch(() => s().measure(0));
    s().nextBatch();
    playBatch(() => s().measure(0));
    s().startDebrief();
    expect(s().phase).toBe("debrief");
  }

  it("each step's numbers sit in the side column", () => {
    toDebrief();
    expect(side(html())).toContain(S.debrief.steps[0]!.stat!("").replace(/: $/, ""));
    s().setDebriefStep(1);
    expect(side(html())).toContain(esc(S.debrief.table("A")));
    s().setDebriefStep(2);
    expect(side(html())).toContain("bars");
  });

  it("the final step and /credits: short credits, the asset list behind a button", () => {
    toDebrief();
    s().setDebriefStep(S.debrief.steps.length - 1);
    for (const markup of [html(), renderToString(<Credits />)]) {
      expect(markup).toContain(S.credits.lead);
      expect(markup).toContain(S.credits.how);
      expect(markup).not.toContain('class="assets"');
      expect(markup).not.toContain("station-stability-0");
    }
  });
});
