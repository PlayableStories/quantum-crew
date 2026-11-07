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

  it("the lull: Start the wave and the talking clock; no countdown", () => {
    const s = { ...room("strategy", false, 2), lullSince: 0, serverNow: 83_000 };
    const markup = tv(s);
    expect(markup).toContain(`>${S.tv.cmd.startBatch}</button>`);
    expect(markup).toContain(S.tv.talking("1:23"));
    expect(markup).not.toContain(`>${S.tv.cmd.revealCeiling}</button>`); // not this step's
  });
});
