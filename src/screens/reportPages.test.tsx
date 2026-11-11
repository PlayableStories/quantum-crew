// The incident report, one idea per page (R2): each page's on-screen body is short enough to read in a room (≤ 80
// words, in both modes and both endings), page 3 opens with its question, the numbers come from the maths, and the
// lines cut from the screen live in the remote's talking points (event) or a closed "More detail" (solo).
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Solo } from "../solo/Solo.tsx";
import { soloStore } from "../solo/soloStore.ts";
import { CLASSICAL_LIMIT, QUANTUM_LIMIT } from "../shared/chsh.ts";
import { clueAnswer } from "../shared/crystalPlan.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { talkingPoints } from "./Remote.tsx";
import { TvDebrief } from "./Screen.tsx";

// Server rendering reads the store's initial state; render the live one (as the solo tests do).
soloStore.getInitialState = soloStore.getState;

const words = (lines: readonly string[]) => lines.join(" ").split(/\s+/).filter(Boolean).length;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const PAGES = [0, 1, 2];

const tv = (step: number, saved: boolean) =>
  renderToString(<TvDebrief state={{ ...room("debrief", false, 3), debriefStep: step, stationSaved: saved } as RoomState} onCommand={() => {}} />);
const solo = (step: number, saved: boolean) => {
  soloStore.getState().reset();
  soloStore.setState({ phase: "debrief", act3Passed: saved } as never);
  soloStore.getState().setDebriefStep(step);
  return renderToString(<Solo />);
};

describe("the incident report: one idea per page", () => {
  it("each page's body is at most 80 words in both modes and both endings (page 1 counted with its summary)", () => {
    for (const [steps, three] of [
      [S.debrief.steps, S.report],
      [S.event.report.steps, S.event.report.three],
    ] as const)
      for (const step of PAGES)
        for (const summary of [three.story, three.storyNotSaved]) {
          const body = [...steps[step]!.body, ...(step === 0 ? [summary] : [])];
          expect(words(body), `page ${step + 1}`).toBeLessThanOrEqual(80);
        }
    // And that is what the screens show: the body, in both endings.
    for (const step of PAGES)
      for (const saved of [true, false]) {
        for (const line of S.event.report.steps[step]!.body) expect(tv(step, saved)).toContain(esc(line));
        for (const line of S.debrief.steps[step]!.body) expect(solo(step, saved)).toContain(esc(line));
      }
  });

  it("page 3's title is the question it answers, in both modes", () => {
    for (const steps of [S.debrief.steps, S.event.report.steps])
      expect(steps[2]!.title).toBe("Did the crystals let you talk through the storm?");
  });

  it("the numbers in the copy match the maths: 75%, 85.4%, 22.5°", () => {
    const limit = `${Math.round(CLASSICAL_LIMIT * 100)}%`;
    const best = `${Math.round(QUANTUM_LIMIT * 1000) / 10}%`;
    expect([limit, best]).toEqual(["75%", "85.4%"]);
    expect(clueAnswer().spacing).toBe(22.5);
    for (const steps of [S.debrief.steps, S.event.report.steps]) {
      expect(steps[0]!.title).toBe(`No plan beats ${limit}`);
      expect(steps[1]!.body.join(" ")).toContain(`Spread 22.5° apart, every case holds ${best}.`);
      expect(steps[1]!.body.join(" ")).toContain(`scores only ${limit}`);
    }
    expect(S.report.story).toContain(`no plan beat ${limit}`);
    expect(S.event.report.three.storyNotSaved).toContain("the crew's didn't get there this time");
    expect(S.report.storyNotSaved).toContain("yours didn't get there this time");
  });

  it("the remote's talking points at each report page are that page's moved lines", () => {
    for (const step of PAGES) {
      const points = talkingPoints({ ...room("debrief", false, 3), debriefStep: step });
      for (const line of S.event.report.more[step]!) expect(points).toContain(line);
    }
    expect(S.event.report.more[0]!.join(" ")).toContain("even a random one");
    expect(S.event.report.more[0]!.join(" ")).toContain("COOL = 0, HOT = 1");
    expect(S.event.report.more[1]!.join(" ")).toContain("157.5°");
    expect(S.event.report.more[2]!.join(" ")).toContain("spooky action at a distance");
  });

  it("solo's More detail holds each page's moved lines and is closed by default", () => {
    for (const step of PAGES) {
      const markup = solo(step, false);
      const details = markup.match(/<details class="debrief__more"[^>]*>[\s\S]*?<\/details>/)?.[0];
      expect(details, `page ${step + 1}`).toBeDefined();
      expect(details).not.toMatch(/<details[^>]* open/);
      expect(details).toContain(S.debrief.moreHead);
      for (const line of S.debrief.more[step]!) expect(details).toContain(esc(line));
    }
    // Not on the credits page.
    expect(solo(S.debrief.steps.length - 1, false)).not.toContain("debrief__more");
  });
});
