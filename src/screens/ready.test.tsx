// The lull's ready step (R1), server-rendered: the phone's Ready under the plan (both acts) with the partner's state;
// what the TV and the remote show is added with them. The room's own logic is in server/room.test.ts.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { Act, RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);

/** Ada (Table A) with Bo, or with CORA, in a lull; `ready` is the room's flags for the pair. */
function lull(act: Act, ready: { a: boolean; b: boolean }, bot = false): RoomState {
  const s = room("strategy", bot, act);
  s.pairs[0] = { ...s.pairs[0]!, ready };
  return s;
}

beforeEach(() => put({ round: null, flash: null }));

describe("the phone's Ready (R1)", () => {
  it("Act II: Ready under the plan picker, and the partner still planning", () => {
    seat(lull(2, { a: false, b: false }));
    const markup = html();
    expect(markup).toContain("plan-box--phone"); // the plan stays
    expect(markup).toMatch(/class="btn ready-btn btn--primary" aria-pressed="false">Ready</);
    expect(markup).toContain(S.event.ready.partnerPlanning("Bo"));
    // The Ready button sits in the sticky bar, after the plan.
    expect(markup.indexOf("action-bar")).toBeGreaterThan(markup.indexOf("plan-box--phone"));
  });

  it("after tapping: Ready ✓ · tap to change, the plan still visible, and the partner's state from the room", () => {
    seat(lull(2, { a: true, b: true }));
    const markup = html();
    expect(markup).toContain("plan-box--phone");
    expect(markup).toMatch(/aria-pressed="true">Ready ✓ · tap to change</);
    expect(markup).toContain(S.event.ready.partnerReady("Bo"));
  });

  it("Act III: Ready under the crystal plan card", () => {
    seat(lull(3, { a: false, b: true }));
    const markup = html();
    expect(markup).toContain("crystal-plan--phone");
    expect(markup).toContain(`>${S.event.ready.button}<`);
    expect(markup).toContain(S.event.ready.partnerReady("Bo"));
    expect(markup.indexOf("action-bar")).toBeGreaterThan(markup.indexOf("crystal-plan--phone"));
  });

  it("with CORA as partner, she is always ready (the room says so)", () => {
    seat(lull(2, { a: false, b: true }, true));
    expect(html()).toContain(S.event.ready.partnerReady(S.crew.name));
  });

  it("only in a lull: no Ready in a wave, the lobby or wave done", () => {
    for (const phase of ["lobby", "round", "batchDone"] as const) {
      seat(room(phase, false, 2));
      expect(html(), phase).not.toContain("ready-btn");
    }
  });

  it("Ready belongs to the lull and never says locked; Plan locked stays the wave's", () => {
    const words = [
      S.event.ready.button,
      S.event.ready.buttonOn,
      S.event.ready.partnerReady("Bo"),
      S.event.ready.partnerPlanning("Bo"),
      S.event.ready.planning,
      S.event.ready.one("Bo"),
      S.event.ready.both,
      S.phone.huddle,
      S.phone.huddleBody,
    ];
    for (const w of words) expect(w).not.toMatch(/lock/i);
    seat(lull(2, { a: true, b: true }));
    expect(esc(html())).not.toContain(S.planBadge.stamp);
  });
});
