// Facilitator-paced event mode on a phone (server-rendered, no browser): no full-width Leave button (it's in the "⋯"
// menu, behind a confirmation), a status line where it was, whether the partner has chosen, CORA covering an away
// partner, and the countdown following the room's deadline (none in manual).
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);

beforeEach(() => put({ round: null, flash: null }));

describe("a phone, paced", () => {
  it("leaving lives in the ⋯ menu, not a full-width button; a status line sits where it was", () => {
    seat(room("batchDone", false, 2));
    const markup = html();
    expect(markup).toContain(`aria-label="${S.phone.menu.open}"`);
    expect(markup).not.toContain(">Leave</button>");
    expect(markup).toContain(S.phone.status.watch);
  });

  it("the status line by phase: none in the lull, a manual or an auto result", () => {
    seat(room("strategy", false, 2));
    expect(html()).not.toContain("phone-status"); // the lull already says to talk
    seat({ ...room("roundResult", false, 2), auto: false });
    expect(html()).toContain(S.phone.status.manualResult);
    seat({ ...room("roundResult", false, 2), auto: true });
    expect(html()).toContain(S.phone.status.autoResult);
  });

  it("after setting the pump: whether the partner has chosen, never what", () => {
    const s = room("round", false, 2);
    seat(s);
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: null, dialDeg: null, answered: 0, measuring: false, partner: null, crystal: null } });
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
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: 3500, dialDeg: null, answered: null, measuring: false, partner: null, crystal: null } });
    seat({ ...room("round", false, 2), deadline: null });
    expect(html()).not.toContain("countdown");
    // Auto at Relaxed with 9 s of 12 left: the bar starts 3 s in.
    seat({ ...room("round", false, 2), auto: true, deadline: 9000, serverNow: 0 });
    put({ round: { roundId: "1-1", act: 2, light: 0, ms: null, dialDeg: null, answered: null, measuring: false, partner: null, crystal: null } });
    const markup = html();
    expect(markup).toContain("countdown");
    expect(markup).toContain("animation-duration:12000ms;animation-delay:-3000ms");
  });
});
