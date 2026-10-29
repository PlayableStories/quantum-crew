// Renders the real solo screens (server-side, no browser) to check the comms rule in the markup itself:
// during a batch the radio is dark and no crewmate line appears; between batches the crewmate is on the radio.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { BATCH_SIZE, ACT3_ROUND_MS } from "../config.ts";
import { CLOCKWISE } from "../shared/fiction.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);

// Server rendering reads zustand's *initial* state snapshot; point it at the live state so the markup follows the game.
soloStore.getInitialState = soloStore.getState;

function finishBatch() {
  let now = 0;
  for (let i = 0; i < BATCH_SIZE; i++) {
    s().advance(now);
    s().answer(CLOCKWISE, now);
    s().measure(now);
    s().followCrystal(now);
    now += ACT3_ROUND_MS + 1;
    s().timeout(now);
  }
  s().advance(now);
}

describe("comms in the rendered screens", () => {
  beforeEach(() => s().reset());

  it("Act II batch: comms dark, no radio line, before and after a round", () => {
    toHuddle(s);
    expect(html()).toContain("radio-line");
    s().beginBatch();
    expect(html()).toContain("comms-dark");
    expect(html()).not.toContain("radio-line");
    s().advance(0);
    s().answer(CLOCKWISE, 0);
    const markup = html();
    expect(markup).toContain("telemetry");
    expect(markup).not.toContain("radio-line");
  });

  it("Act III batch: comms dark, no radio line; the readout brings the radio back", () => {
    toHuddle(s);
    s().beginBatch();
    finishBatch();
    expect(html()).toContain("radio-line");
    s().reportCeiling();
    s().revealTool();
    s().openTool();
    s().beginBatch();
    s().advance(0);
    expect(html()).toContain("comms-dark");
    expect(html()).not.toContain("radio-line");
    s().measure(0); // the crystal has spoken; the round is still live
    expect(html()).not.toContain("radio-line");
    s().followCrystal(0);
    expect(html()).not.toContain("radio-line");
  });
});
