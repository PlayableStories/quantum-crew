// Renders every solo screen (server-side) and checks the shared frame: the mute toggle sits in the header row (no
// floating button), and each screen's primary action, or the round's pump / MEASURE buttons, is in the ActionBar.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { BATCH_SIZE, ACT3_ROUND_MS } from "../config.ts";
import { CLOCKWISE } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();

// Server rendering reads zustand's *initial* state snapshot; point it at the live state so the markup follows the game.
soloStore.getInitialState = soloStore.getState;

/** The markup split at the ActionBar: everything before it, and the bar itself. */
function render() {
  const html = renderToString(<Solo />);
  const at = html.indexOf('class="action-bar"');
  return { html, body: at < 0 ? html : html.slice(0, at), bar: at < 0 ? "" : html.slice(at) };
}

function expectFrame(label: string, primary: RegExp | null) {
  const { html, body, bar } = render();
  expect(html.match(/class="layout__head"/g), label).toHaveLength(1);
  const head = html.slice(html.indexOf('class="layout__head"'), html.indexOf('class="layout__main"'));
  expect(head, label).toContain("mute");
  expect(html, label).not.toContain("mute--float");
  if (primary) {
    expect(bar, label).toMatch(primary);
    expect(body, label).not.toMatch(primary);
  } else expect(bar, label).toBe("");
}

function playBatch(act: () => void) {
  let now = 0;
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
    act();
    now += ACT3_ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

const PRIMARY = /btn--primary/;

describe("solo screen frame", () => {
  beforeEach(() => s().reset());

  it("every phase: mute in the header row, the main action in the ActionBar", () => {
    expectFrame("intro", PRIMARY);
    toHuddle(s);
    expectFrame("huddle", PRIMARY);

    s().beginBatch();
    expectFrame("act2 lead-in", null);
    s().advance(0);
    expectFrame("act2 live round", /pumpbtn/);
    s().answer(CLOCKWISE, 0);
    expectFrame("act2 result", /Next round/); // the result waits for Next round
    s().timeout(ACT3_ROUND_MS + 1);
    playBatch(() => s().answer(CLOCKWISE, 0));
    expect(s().phase).toBe("act2Readout");
    expectFrame("act2 readout", PRIMARY);

    s().reportCeiling();
    expectFrame("engineering report", PRIMARY);
    s().revealTool();
    expectFrame("tool reveal", PRIMARY);
    s().openTool();
    expectFrame("tuning", PRIMARY);

    s().beginBatch();
    s().advance(0);
    expectFrame("act3 live round", /measure/);
    s().measure(0);
    expectFrame("act3 crystal says", /pumpbtn/); // MEASURE gives way to the pumps
    s().followCrystal(0);
    expectFrame("act3 result", /Next round/);
    s().timeout(ACT3_ROUND_MS + 1);
    playBatch(() => (s().measure(0), s().followCrystal(0)));
    expect(s().phase).toBe("act3Readout");
    expectFrame("act3 readout", PRIMARY);

    // A second Act III batch always unlocks the debrief.
    s().nextBatch();
    s().beginBatch();
    playBatch(() => (s().measure(0), s().followCrystal(0)));
    s().startDebrief();
    s().openReport(); // the resolution, then the incident report
    expect(s().phase).toBe("debrief");
    for (let step = 0; step < S.debrief.steps.length; step++) {
      s().setDebriefStep(step);
      expectFrame(`debrief ${step + 1}`, PRIMARY);
    }
  });

  it("the huddle offers the rule chip with an Explain button and a closed sheet", () => {
    toHuddle(s);
    const { body } = render();
    expect(body).toContain("rule-chip");
    expect(body).toContain(S.rule.explain);
    expect(body).toMatch(/<dialog[^>]*class="sheet"/);
    expect(body).not.toMatch(/<dialog[^>]*open/);
  });
});
