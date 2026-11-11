// Event E3a on the TV (server-rendered, no browser): the storm passes (saved or not, as in solo) and the incident
// report in the crew's version, stepped by the room's debriefStep.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { pct } from "../components/StabilityMeter.tsx";
import { CLASSICAL_LIMIT, OPTIMAL_TUNING, QUANTUM_LIMIT } from "../shared/chsh.ts";
import { answerPlanFor } from "../shared/crystalPlan.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { ResolutionPanel, TvDebrief } from "./Screen.tsx";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
const noop = () => {};

/** The room in the debrief at `step`: saved with pair 1 at the best dials, or not saved at 0° / 0° (75%). */
function report(step: number, saved: boolean): RoomState {
  const s = room("debrief", false, 3);
  const zero = { greenDeg: 0, redDeg: 0 };
  s.pairs[0] = { ...s.pairs[0]!, lockedDials: saved ? { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } : { a: zero, b: zero } };
  return {
    ...s,
    debriefStep: step,
    stationSaved: saved,
    savedDialsRate: saved ? QUANTUM_LIMIT : null,
    crewDialsRate: saved ? QUANTUM_LIMIT : 0.75,
    stability: { ...s.stability, act1: { rounds: 6, wins: 6, timeouts: 0 } },
    marginals: { rows: [], crew: { partnerGreen: 0.5, partnerRed: 0.48, rounds: 24 } },
  };
}

describe("the storm passes (TV)", () => {
  it("saved: the calm station clearing and the steady log; not saved: damaged, with emergency measures", () => {
    const saved = renderToString(<ResolutionPanel saved />);
    expect(saved).toContain(S.resolution.log);
    expect(saved).toContain("station__clearing");
    expect(saved).not.toContain("station--damaged");
    expect(saved).toContain(esc(S.event.resolution.room));
    const notSaved = renderToString(<ResolutionPanel saved={false} />);
    expect(notSaved).toContain(esc(S.resolution.logNotSaved));
    expect(notSaved).toContain("station--damaged");
  });
});

describe("the incident report (TV)", () => {
  it("step 1, saved: the crew's three numbers and the saved summary", () => {
    const markup = renderToString(<TvDebrief state={report(0, true)} onCommand={noop} />);
    expect(markup).toContain(S.report.kicker);
    expect(markup).toContain(S.event.report.three.act1Yours("100.0%"));
    expect(markup).toContain(`>${pct(QUANTUM_LIMIT)}<`);
    expect(markup).toContain(esc(S.event.report.three.act3Note));
    expect(markup).toContain(esc(S.event.report.three.story));
  });

  it("step 1, not saved: the best dials lead, the crew's number underneath, the honest summary", () => {
    const markup = renderToString(<TvDebrief state={report(0, false)} onCommand={noop} />);
    expect(markup).toContain(`>${pct(QUANTUM_LIMIT)}<`);
    expect(markup).toContain(S.report.act3Best);
    expect(markup).toContain(esc(S.event.report.three.act3Yours("75.0%")));
    expect(markup).toContain(esc(S.event.report.three.storyNotSaved));
  });

  it("step 2: the best plan beside the best pair's crystal plans, or the best plans if no pair reached 80%", () => {
    expect(renderToString(<TvDebrief state={report(1, true)} onCommand={noop} />)).toContain(
      esc(S.event.report.pairDials(1, "Ada", "Bo")),
    );
    expect(renderToString(<TvDebrief state={report(1, false)} onCommand={noop} />)).toContain(S.event.report.bestPlans);
  });

  it("step 3: exact 50% for both tables, the crew's real numbers, and why the storm couldn't jam the crystals", () => {
    const markup = renderToString(<TvDebrief state={report(2, true)} onCommand={noop} />);
    expect(markup).toContain(esc(S.debrief.panel.row(S.event.table("A"), S.light[0])));
    expect(markup).toContain(esc(S.event.report.crewRounds(24, "50.0%", "48.0%")));
    expect(markup).toContain(esc(S.report.noJam));
  });

  it("the step comes from the room: Back is off on step 1, Next is off on the credits", () => {
    expect(renderToString(<TvDebrief state={report(0, true)} onCommand={noop} />)).toMatch(/<button class="btn" disabled="">/);
    expect(renderToString(<TvDebrief state={report(3, true)} onCommand={noop} />)).toMatch(/btn--primary" disabled=""/);
  });

  it("the credits name who designed and made the game", () => {
    expect(renderToString(<TvDebrief state={report(3, true)} onCommand={noop} />)).toContain(S.credits.studio);
  });
});

describe("the ending on a phone", () => {
  const phone = () => renderToString(<Play />);
  beforeEach(() => put({ round: null, flash: null }));

  it("the engineering report: a prompt to a human partner by name; CORA's own line to her partner", () => {
    seat(room("ceiling", false, 2));
    expect(phone()).toContain(S.event.beats.ceiling("Bo"));
    seat(room("ceiling", true, 2));
    const cora = phone();
    expect(cora).toContain(esc(S.crew.ceiling));
    expect(cora).not.toContain(S.event.beats.head);
  });

  it("the storm passes: comms are back; CORA's saved or not-saved line to her partner", () => {
    seat({ ...room("resolution", false, 3), stationSaved: true });
    expect(phone()).toContain(S.event.resolution.prompt("Bo"));
    seat({ ...room("resolution", true, 3), stationSaved: true });
    expect(phone()).toContain(esc(S.crew.resolution));
    seat({ ...room("resolution", true, 3), stationSaved: false });
    expect(phone()).toContain(esc(S.crew.resolutionNotSaved));
  });

  it("the incident report: the pair's own three numbers, a dash for an act they didn't play", () => {
    const s = room("debrief", false, 3);
    s.pairs[0] = {
      ...s.pairs[0]!,
      act1: { rounds: 6, wins: 5, timeouts: 0 },
      locked: { a: { onGreen: 0, onRed: 1 }, b: { onGreen: 0, onRed: 0 } },
      lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B },
    };
    seat(s);
    const markup = phone();
    expect(markup).toContain(S.event.report.phoneHead("Bo"));
    expect(markup).toContain(`>${pct(5 / 6)}<`);
    expect(markup).toContain(">75.0%<");
    expect(markup).toContain(`>${pct(QUANTUM_LIMIT)}<`);
    seat(room("debrief", false, 3)); // a pair that played nothing
    expect(phone().match(/>—</g)).toHaveLength(3);
  });
});

describe("the event report's physics and the briefing (E3g)", () => {
  /** Every string under a key (functions called with sample args). */
  const texts = (v: unknown): string[] =>
    typeof v === "string"
      ? [v]
      : typeof v === "function"
        ? [String((v as (...a: unknown[]) => unknown)(1, "x", "y"))]
        : v && typeof v === "object"
          ? Object.values(v).flatMap(texts)
          : [];

  it("no report string says the pumps agree with probability cos²; the crystals' rule is about the crystals", () => {
    for (const t of texts(S.event.report)) expect(t).not.toMatch(/pumps agree/);
    expect(S.event.report.steps[1]!.body.join(" ")).toContain("they give the same direction cos²(g) of the time");
    expect(S.event.report.steps[1]!.body.join(" ")).not.toMatch(/Nobel/); // step 1 covers it
    const one = S.event.report.steps[0]!.body;
    expect(one[0]).toContain("Physicists call a plan agreed in advance a local hidden-variable theory.");
    const two = S.event.report.steps[1]!.body;
    const same = two.find((l) => l.startsWith("At the same setting"))!;
    expect(same).toContain(`only ${CLASSICAL_LIMIT * 100}%`);
    expect(two[two.findIndex((l) => l.includes("Tsirelson")) - 1]).toBe(same);
    expect(S.event.report.crewRounds(24, "50.0%", "48.0%")).toContain("pump choices");
  });

  it("the briefing names no number of seconds (the facilitator sets the pace)", () => {
    for (const t of texts(S.event.briefing)) expect(t).not.toMatch(/\d+\s*(s\b|sec)/i);
  });

  it("the best-plan label shows both tables' settings, computed from the answer", () => {
    const deg = (t: "A" | "B") => `${answerPlanFor(t).greenDeg}° / ${answerPlanFor(t).redDeg}°`;
    expect(S.event.report.bestPlans).toBe(`The best crystal plans (A: ${deg("A")} · B: ${deg("B")})`);
    expect(S.event.report.bestPlans).toContain("B: 22.5° / 157.5°");
  });
});
