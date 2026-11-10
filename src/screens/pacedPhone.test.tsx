// Facilitator-paced event mode on a phone (server-rendered, no browser): no full-width Leave button (it's in the "⋯"
// menu, behind a confirmation), the header's phase status on every screen (U1), whether the partner has chosen, CORA
// covering an away partner, and the countdown following the room's deadline (none in manual).
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { RoomPhase } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { phoneStatus } from "./phoneStatus.ts";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);

beforeEach(() => put({ round: null, flash: null }));

describe("a phone, paced", () => {
  it("leaving lives in the ⋯ menu, not a full-width button", () => {
    seat(room("batchDone", false, 2));
    const markup = html();
    expect(markup).toContain(`aria-label="${S.phone.menu.open}"`);
    expect(markup).not.toContain(">Leave</button>");
  });

  it("the header names the phase on every screen; nothing to do = the calm idle state, no instruction (U1)", () => {
    const phases = {
      lobby: true, briefing: true, storm: true, strategy: true, round: true, roundResult: true, batchDone: true,
      ceiling: true, tool: true, resolution: true, debrief: true,
    } satisfies Record<RoomPhase, true>;
    for (const phase of Object.keys(phases) as RoomPhase[]) {
      for (const act of [1, 2, 3] as const) {
        const state = { ...room(phase, false, act), batchNo: 1, roundNo: 4 };
        const status = phoneStatus(state, { seated: true, round: null });
        expect(status, `${phase} act ${act}`).toMatch(/\S/);
        seat(state);
        const markup = html();
        expect(markup, phase).toMatch(new RegExp(`class="phone-head__status"><p class="kicker" role="status">${esc(status).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`));
      }
    }
    seat(room("lobby"));
    expect(html()).toContain("phone-idle");
    seat({ ...room("roundResult", false, 2), batchNo: 1 });
    expect(html()).toContain(S.phone.phase.waveNext(1));
    expect(html()).toContain("phone-idle"); // no flash: nothing to show
  });

  it("a live wave round: the status says whose turn it is, then pump set", () => {
    seat({ ...room("round", false, 2), batchNo: 1, roundNo: 4 });
    put({ round: { roundId: "1-4", act: 2, light: 0, ms: null, dialDeg: null, answered: null, partner: null, crystal: null } });
    expect(html()).toContain(S.phone.phase.waveRound(1, 4, false));
    put({ round: { roundId: "1-4", act: 2, light: 0, ms: null, dialDeg: null, answered: 0, partner: null, crystal: null } });
    expect(html()).toContain(S.phone.phase.waveRound(1, 4, true));
  });

  it("no phone string sends anyone to the big screen (U1)", () => {
    const strings = (v: unknown): string[] =>
      typeof v === "string"
        ? [v]
        : typeof v === "function"
          ? [String(v)]
          : v && typeof v === "object"
            ? Object.values(v).flatMap(strings)
            : [];
    for (const text of strings(S.phone)) expect(text).not.toMatch(/big screen/i);
    expect(S.phone.huddleBody).not.toMatch(/clock/i);
  });

  it("after setting the pump: whether the partner has chosen, never what", () => {
    const s = room("round", false, 2);
    seat(s);
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: null, dialDeg: null, answered: 0, partner: null, crystal: null } });
    expect(html()).toContain(esc(S.phone.waitingFor("Bo")));
    s.pairs[0]!.answered = { a: true, b: true };
    seat(s);
    expect(html()).toContain(S.phone.partnerChosen("Bo"));
  });

  it("an away partner: CORA covers their seat", () => {
    const s = room("batchDone", false, 2);
    s.players = s.players.map((p) => (p.name === "Bo" ? { ...p, connected: false } : p));
    seat(s);
    expect(html()).toContain(esc(S.phone.partnerCovered("Bo", "B")));
  });

  it("the countdown follows the room's deadline: none in manual, part-drained in auto", () => {
    // The round started with a countdown (ms), but the room has since switched to manual: no countdown.
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: 3500, dialDeg: null, answered: null, partner: null, crystal: null } });
    seat({ ...room("round", false, 2), deadline: null });
    expect(html()).not.toContain("countdown");
    // Auto at Relaxed with 9 s of 12 left: the bar starts 3 s in.
    seat({ ...room("round", false, 2), auto: true, deadline: 9000, serverNow: 0 });
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: null, dialDeg: null, answered: null, partner: null, crystal: null } });
    const markup = html();
    expect(markup).toContain("countdown");
    expect(markup).toContain("animation-duration:12000ms;animation-delay:-3000ms");
  });
});
