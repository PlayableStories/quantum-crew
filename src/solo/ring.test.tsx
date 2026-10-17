// The live ring on rounds (server-rendered, no browser): each cause draws its own ring, the vent opens only on a
// double HOT, and while a round is live the ring shows nothing about the crewmate's sensor (comms are dark).
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { ROUND_MS } from "../config.ts";
import { scoreRound, type Bit } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";

const ring = (x: Bit, y: Bit, a: Bit | null, b: Bit | null) =>
  renderToString(<RingDiagram result={scoreRound(x, y, a, b)} />);
const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

describe("live ring", () => {
  it("draws each cause, with the vent open only when both sections are HOT", () => {
    const cases = [
      [COOL, COOL, CLOCKWISE, CLOCKWISE],
      [HOT, COOL, ANTICLOCKWISE, ANTICLOCKWISE],
      [HOT, HOT, CLOCKWISE, ANTICLOCKWISE],
      [COOL, HOT, CLOCKWISE, ANTICLOCKWISE],
      [HOT, HOT, CLOCKWISE, CLOCKWISE],
      [COOL, HOT, null, CLOCKWISE],
    ] as const;
    const seen = new Set<string>();
    for (const [x, y, a, b] of cases) {
      const cause = roundCause({ x, y, a, b });
      seen.add(cause);
      const markup = ring(x, y, a, b);
      expect(markup).toContain(`ring--${cause}`);
      const bothHot = x === HOT && y === HOT;
      expect(markup.includes("ring__vent--open"), cause).toBe(bothHot);
      expect(markup).toContain(bothHot ? S.ring.ventOpen : S.ring.ventLocked);
      // Each half and its label follow that section's sensor.
      expect(markup).toMatch(new RegExp(`ring__half ring__half--${x === HOT ? "hot" : "cool"}[^]*ring__half ring__half--${y === HOT ? "hot" : "cool"}`));
      expect(markup).toContain(`>${S.light[x]}</text>`);
    }
    expect(seen).toEqual(new Set(["circulate", "carry", "purge", "spike", "overheat", "slow"]));
  });

  it("spins each pump its own way, and stops a pump that never moved", () => {
    const fought = ring(COOL, HOT, CLOCKWISE, ANTICLOCKWISE);
    expect(fought).toContain("ring__impeller--cw");
    expect(fought).toContain("ring__impeller--acw");
    expect(count(fought, /ring__flow-dash /g)).toBe(2);
    const slow = ring(COOL, HOT, null, CLOCKWISE);
    expect(slow).toContain("ring__pump--stopped");
    expect(slow).toContain(">—</text>");
    expect(slow).not.toContain("ring__flow-dash");
  });

  it("marks a spike with a burst, a purge with puffs out of the vent and an overheat with a glow", () => {
    expect(ring(COOL, COOL, CLOCKWISE, ANTICLOCKWISE)).toContain("ring__burst");
    expect(count(ring(HOT, HOT, ANTICLOCKWISE, CLOCKWISE), /ring__purge-puff/g)).toBe(3);
    expect(ring(HOT, HOT, CLOCKWISE, CLOCKWISE)).toContain("ring__glow");
  });

  it("is decorative when live (the telemetry says it in words); the rule diagram keeps its label", () => {
    expect(ring(COOL, COOL, CLOCKWISE, CLOCKWISE)).toContain('aria-hidden="true"');
    const rule = renderToString(<RingDiagram />);
    expect(rule).toContain(`aria-label="${S.ring.label}"`);
    expect(rule).toContain(S.ring.ventNote);
    expect(rule).not.toContain("ring--live");
  });
});

describe("the ring during a batch", () => {
  const s = () => soloStore.getState();
  const html = () => renderToString(<Solo />);
  soloStore.getInitialState = soloStore.getState;
  /** Nothing in the markup that depends on a sensor reading: no coloured halves, no COOL/HOT labels on the ring. */
  const ringRevealsNothing = (markup: string) => {
    expect(markup).toContain("ring--idle");
    expect(markup).not.toContain("ring__half");
    expect(markup).not.toContain("ring__reading");
    expect(markup).not.toContain("ring--live");
  };

  beforeEach(() => s().reset());

  it("stays idle through the lead-in and every live round, in both acts; the result brings it to life", () => {
    s().start();
    s().beginBatch();
    ringRevealsNothing(html());
    let now = 0;
    for (let i = 0; i < 12; i++) {
      s().advance(now);
      ringRevealsNothing(html());
      s().answer(CLOCKWISE, now);
      expect(html()).toContain("ring--live");
      now += ROUND_MS + 1;
      s().timeout(now);
    }
    s().advance(now);
    s().reportCeiling();
    s().revealTool();
    s().openTool();
    s().beginBatch();
    s().advance(0);
    ringRevealsNothing(html());
    s().measure(0);
    expect(html()).toContain("ring--live");
  });
});
