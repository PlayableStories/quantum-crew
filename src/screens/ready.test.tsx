// The lull's ready step (R1), server-rendered: the phone's Ready under the plan (both acts) with the partner's state;
// the TV's pair states, count and "Start anyway?"; the remote's big button, room lines and talking point. The room's
// own logic (who is ready, the confirmation, the step) is in server/room.test.ts.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { Act, RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { useHost } from "../net/hostStore.ts";
import { readyPairs } from "../shared/ready.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { RemotePanel, talkingPoints } from "./Remote.tsx";
import { CrystalLull, Screen } from "./Screen.tsx";
import { stepLabel } from "./hostSteps.tsx";

Object.assign(globalThis, { location: { origin: "http://localhost:8787", hostname: "localhost" } });

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

/** Three pairs in a lull: pair 1 both ready, pair 2 one ready (Cy), pair 3 planning. */
function mixed(act: Act = 2, startConfirm = false): RoomState {
  const s = room("strategy", false, act);
  const base = s.pairs[0]!;
  s.pairs = [
    { ...base, id: 1, ready: { a: true, b: true } },
    { ...base, id: 2, a: { playerId: "cy", name: "Cy" }, b: { playerId: "di", name: "Di" }, ready: { a: true, b: false } },
    { ...base, id: 3, a: { playerId: "ed", name: "Ed" }, b: { playerId: "flo", name: "Flo" }, ready: { a: false, b: false } },
  ];
  return { ...s, startConfirm, lullSince: 0, serverNow: 65_000 };
}
const tv = (state: RoomState) => {
  Object.assign(useHost.getInitialState(), { state, status: "open", localDeadline: null, results: null, error: null });
  return renderToString(<Screen />);
};
const remote = (state: RoomState) =>
  renderToString(<RemotePanel state={state} localDeadline={null} lastResults={null} offline={false} error={null} onCommand={() => {}} />);

describe("what the facilitator sees (R1)", () => {
  it("the TV's pair cards: Ready (green), one partner ready by name, Planning", () => {
    const markup = tv(mixed());
    expect(markup).toContain(`✓ ${S.event.ready.both}`);
    expect(markup).toContain(S.event.ready.one("Cy"));
    expect(markup).toContain(`ready-tag--planning">${S.event.ready.planning}<`);
    expect(markup.match(/pair--ready/g)).toHaveLength(1);
  });

  it("the start control counts the room's ready pairs; the banner too (it stays when a remote hides the row)", () => {
    const s = mixed();
    expect(readyPairs(s)).toEqual({ ready: 1, total: 3, planning: 2 });
    expect(stepLabel(s, "startBatch")).toBe(S.tv.startWave(1, 3));
    expect(tv(s)).toContain(`>${S.tv.startWave(1, 3)}</button>`);
    const paired = tv({ ...s, remotes: 1 });
    expect(paired).not.toContain("tv__controls");
    expect(paired).toContain(S.tv.readyCount(1, 3));
  });

  it("armed, the TV and the remote both ask \"Start anyway?\" (the room's state), styled as a warning", () => {
    const s = mixed(2, true);
    expect(stepLabel(s, "startBatch")).toBe(S.tv.startAnyway(2));
    expect(S.tv.startAnyway(2)).toBe("2 pairs still planning. Start anyway?");
    expect(tv(s)).toMatch(/btn--warn">2 pairs still planning\. Start anyway\?</);
    expect(tv({ ...s, remotes: 1 })).toContain(S.tv.confirmNote);
    expect(remote(s)).toMatch(/remote__primary btn--warn">2 pairs still planning\. Start anyway\?</);
  });

  it("Act III's lull (no pair cards on the wide TV): each pair's hint row carries its state", () => {
    const markup = renderToString(<CrystalLull state={{ ...mixed(3), clue: 1 }} />);
    expect(markup).toContain(`✓ ${S.event.ready.both}`);
    expect(markup).toContain(S.event.ready.one("Cy"));
    expect(markup).toContain(S.event.ready.planning);
  });

  it("the remote: each pair's state in the room, and the ready count in the talking points", () => {
    const s = mixed();
    const markup = remote(s);
    expect(markup).toContain(S.remote.pairLine(1, `✓ ${S.event.ready.both}`));
    expect(markup).toContain(S.remote.pairLine(2, S.event.ready.one("Cy")));
    expect(markup).toContain(S.remote.pairLine(3, S.event.ready.planning));
    expect(talkingPoints(s)).toContain(S.remote.talk.ready(1, 3));
    expect(talkingPoints(mixed(3))).toContain(S.remote.talk.ready(1, 3));
    expect(S.remote.talk.ready(3, 3)).toBe("All 3 pairs are ready: start the wave.");
  });
});
