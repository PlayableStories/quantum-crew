// Event Act II (server-rendered, no browser): the lull shows the partner's plan by name, a wave reminds both locked
// plans, results name the cause; after a wave the TV shows each pair's four cases and the luck line, and the
// engineering report marks every pairing the crew tried.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { ClassicalStrategy } from "../shared/chsh.ts";
import type { RoomState, RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { always, put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { CeilingPanel, WaveCases } from "./Screen.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);
const revHot = { onGreen: 0, onRed: 1 } as const;

/** The room in Act II with Bo (or CORA) on `bPlan`, and plans locked as Ada always clockwise × `bPlan`. */
function act2(phase: RoomState["phase"], bPlan: ClassicalStrategy = revHot, bot = false): RoomState {
  const s = room(phase, bot, 2);
  s.pairs[0] = { ...s.pairs[0]!, plans: { a: always, b: bPlan }, locked: { a: always, b: bPlan } };
  return s;
}

beforeEach(() => put({ round: null, flash: null }));

describe("Act II on a phone", () => {
  it("the lull: your four plans, and your partner's choice by name", () => {
    seat(act2("strategy"));
    const markup = html();
    expect(markup).toContain(S.phone.huddle);
    for (const name of S.plans.name) expect(markup).toContain(name);
    expect(markup).toContain(esc(S.event.partnerPlan("Bo")));
    expect(markup).toContain(`<strong>${S.plans.name[1]}</strong>`);
    seat(act2("strategy", always, true));
    expect(html()).toContain(esc(S.event.partnerPlan(S.crew.name)));
  });

  it("a wave: both locked plans as a reminder", () => {
    seat(act2("round"));
    put({ round: { roundId: "1-1", act: 2, light: 1, ms: 3500, dialDeg: null, answered: null, measuring: false, partner: null } });
    expect(html()).toContain(S.event.agreed(always, "Bo", revHot));
  });

  it("a result: the cause and a line of telemetry; too slow names whose pump", () => {
    seat(act2("roundResult"));
    const flash = (a: 0 | 1 | null, b: 0 | 1 | null): { roundId: string } & RoundOutcome => ({
      roundId: "1-1",
      pairId: 1,
      win: false,
      timedOut: a === null || b === null,
      x: 1,
      y: 1,
      a,
      b,
      cause: a === null || b === null ? "slow" : a === b ? "overheat" : "purge",
    });
    put({ flash: flash(0, 0) });
    expect(html()).toContain(S.outcome.overheat.title);
    expect(html()).toContain(S.telemetry.head);
    put({ flash: flash(0, null) });
    expect(html()).toContain(esc("Bo's pump wasn't set in time."));
    put({ flash: flash(null, 0) });
    expect(html()).toContain(esc("Your pump wasn't set in time."));
  });
});

describe("Act II on the TV", () => {
  it("after a wave: each pair's four cases and true rate; the luck line only when the wave beat 80% and the plan can't", () => {
    const s = act2("batchDone");
    s.pairs[0]!.lastWave = { rounds: 12, wins: 10, timeouts: 0 };
    const markup = renderToString(<WaveCases state={s} />);
    expect(markup).toContain(S.event.casesOrder);
    expect(markup).toContain(S.readout.caseTotal(3, "75%"));
    expect(markup).toContain(S.event.waveHeld(10, 12));
    expect(markup).toContain(esc(S.event.lucky("75%")));
    s.pairs[0]!.lastWave = { rounds: 12, wins: 9, timeouts: 0 };
    expect(renderToString(<WaveCases state={s} />)).not.toContain("tv__luck");
  });

  it("the engineering report: tried pairings plain, engineering's marked, the crew's count", () => {
    const s = act2("ceiling");
    s.triedPlans = ["0-1", "0-0"];
    const markup = renderToString(<CeilingPanel state={s} />);
    expect(markup).toContain(esc(S.ceiling.engineering(2, 14)));
    expect(markup).toContain(esc(S.ceiling.truth));
    expect(markup.match(/board__cell--eng/g)).toHaveLength(14);
    expect(markup).toContain(S.event.board.rows);
  });
});
