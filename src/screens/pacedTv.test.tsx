// Facilitator-paced event mode on the TV (server-rendered, no browser): the host row shows only what applies now,
// plus Pause, the pace and Reset; a Guided round has no countdown and shows who is still choosing; the lull shows how
// long the room has been talking; a paused room says so.
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
  it("a Guided round: Close the round, no countdown, and who is still choosing", () => {
    const s = room("round", false, 2);
    s.pairs[0]!.answered = { a: true, b: false };
    const markup = tv({ ...s, pace: "guided" });
    expect(markup).toContain(`>${S.tv.cmd.closeRound}</button>`);
    expect(markup).not.toContain(`>${S.tv.cmd.nextRound}</button>`);
    expect(markup).not.toContain("countdown");
    expect(markup).toContain(S.tv.stillChoosing("Bo"));
    expect(markup).toContain(S.tv.keys);
  });

  it("a Guided result waits for Next round; a Relaxed one moves on by itself", () => {
    const s = room("roundResult", false, 2);
    expect(tv({ ...s, pace: "guided" })).toContain(`>${S.tv.cmd.nextRound}</button>`);
    expect(tv({ ...s, pace: "relaxed" })).not.toContain(`>${S.tv.cmd.nextRound}</button>`);
  });

  it("the lull: Start the wave and the talking clock; no countdown", () => {
    const s = { ...room("strategy", false, 2), lullSince: 0, serverNow: 83_000 };
    const markup = tv(s);
    expect(markup).toContain(`>${S.tv.cmd.startBatch}</button>`);
    expect(markup).toContain(S.tv.talking("1:23"));
    expect(markup).not.toContain(`>${S.tv.cmd.revealCeiling}</button>`); // not this step's
  });

  it("paused: the Paused line and Resume; the pace shows its default until chosen", () => {
    const s = { ...room("round", false, 2), paused: { left: 2000 } };
    const markup = tv(s);
    expect(markup).toContain(S.tv.paused);
    expect(markup).toContain(`>${S.tv.cmd.resume}</button>`);
    expect(markup).not.toContain(`>${S.tv.cmd.closeRound}</button>`); // nothing moves on while paused
    expect(markup).toContain(S.tv.pace.byDefault);
    expect(tv({ ...s, paceChoice: "relaxed", pace: "relaxed" })).toMatch(/aria-checked="true"[^>]*>Relaxed</);
  });
});
