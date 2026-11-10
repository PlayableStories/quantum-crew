// Facilitator-paced event mode on the TV (server-rendered, no browser): the host row shows only what applies now
// (one Next in a round or on a result), plus Play / Pause with its seconds, a closed speed menu (▾) and Reset; manual
// has no countdown and shows who is still choosing; the countdown follows the room's deadline; the lull's clock.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { Screen } from "./Screen.tsx";
import { useHost } from "../net/hostStore.ts";

// The TV reads its own address for the join link; server rendering has none.
Object.assign(globalThis, { location: { origin: "http://localhost:8787", hostname: "localhost" } });

/** Server rendering reads the store's initial state: write the room there. */
function tv(state: RoomState) {
  Object.assign(useHost.getInitialState(), { state, status: "open", localDeadline: null, results: null, error: null });
  return renderToString(<Screen />);
}

describe("the TV's host row (paced)", () => {
  it("a manual round: one Next (Close the round), Play, no countdown, and who is still choosing", () => {
    const s = room("round", false, 2);
    s.pairs[0]!.answered = { a: true, b: false };
    const markup = tv(s);
    expect(markup).toContain(`>${S.tv.closeRound}</button>`);
    expect(markup).not.toContain(`>${S.tv.nextRound}</button>`);
    expect(markup).toContain(`>${S.tv.auto.play}</button>`);
    expect(markup).toContain(S.tv.auto.manualNote);
    expect(markup).not.toContain("countdown__bar");
    expect(markup).toContain(S.tv.stillChoosing("Bo"));
    expect(markup).toContain(S.tv.keys);
  });

  it("a result offers Next round in either mode; auto shows Pause and drains the result's countdown", () => {
    const s = room("roundResult", false, 2);
    expect(tv(s)).toContain(`>${S.tv.nextRound}</button>`);
    const auto = tv({ ...s, auto: true, deadline: 4000, serverNow: 0 });
    expect(auto).toContain(`>${S.tv.nextRound}</button>`);
    expect(auto).toContain(`aria-label="${S.tv.auto.pauseLabel}"`);
    expect(auto).toContain("animation-duration:8000ms;animation-delay:-4000ms"); // Relaxed: 8 s result, 4 s left
  });

  it("the speed menu is closed by default (a small ▾ beside Play)", () => {
    const markup = tv(room("round", false, 2));
    expect(markup).toContain(`aria-label="${S.tv.auto.menu}"`);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("tv__auto-menu");
  });

  it("the lull: Start the wave with the ready count, and the talking clock with it; no countdown", () => {
    const s = { ...room("strategy", false, 2), lullSince: 0, serverNow: 83_000 };
    const markup = tv(s);
    expect(markup).toContain(`>${S.tv.startWave(0, 1)}</button>`);
    expect(markup).toContain(`${S.tv.talking("1:23")} · ${S.tv.readyCount(0, 1)}`);
    expect(markup).not.toContain(`>${S.tv.cmd.revealCeiling}</button>`); // not this step's
  });
});

describe("a quieter TV (U1)", () => {
  it("the large join panel only in the lobby; from the briefing on, a small Join: code in the header (QR on demand)", () => {
    const lobby = tv(room("lobby"));
    expect(lobby).toContain("tv__join--big");
    expect(lobby).not.toContain("tv__join-chip");
    for (const phase of ["briefing", "round", "strategy", "debrief"] as const) {
      const markup = tv(room(phase, false, 2));
      expect(markup, phase).not.toContain("data-join-url"); // the QR is in a closed sheet, not on screen
      expect(markup, phase).toContain(`>${S.tv.joinChip("ABCD")}</button>`);
      expect(markup, phase).toContain(`aria-label="${S.tv.joinChipLabel("ABCD")}"`);
    }
    expect(S.keys.tv.some(([key]) => key === "J")).toBe(true);
  });

  it("a paired remote hides the host row and its key hint; the ? and the keyboard's sheets stay", () => {
    const keysSheet = `aria-label="${S.keys.title}"`;
    const paired = tv({ ...room("round", false, 2), remotes: 1 });
    expect(paired).not.toContain("tv__controls");
    expect(paired).not.toContain(S.tv.keys);
    expect(paired).not.toContain(`>${S.tv.closeRound}</button>`);
    expect(paired).toContain("tv--remote");
    expect(paired).toContain(`aria-label="${S.keys.open}"`);
    expect(paired).toContain(keysSheet); // TvKeys is mounted: the keyboard still works
    const alone = tv(room("round", false, 2));
    expect(alone).toContain("tv__controls");
    expect(alone).toContain(`>${S.tv.closeRound}</button>`);
    expect(alone).toContain(`aria-label="${S.keys.open}"`);
    expect(alone).toContain(keysSheet);
  });
});
