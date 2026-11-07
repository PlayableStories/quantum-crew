// The facilitator's phone remote (server-rendered, no browser): the big button is the step that applies now, the other
// steps sit below, the talking points follow the phase, the room shows who is still choosing and each pair's cause, and
// nothing reveals a sensor or a pump. The TV's pairing dialog links to /host with the room and its remote key.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { remoteUrl } from "../net/joinOrigin.ts";
import { useHost } from "../net/hostStore.ts";
import type { RoomState, RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { RemotePairing, Screen } from "./Screen.tsx";
import { RemotePanel, remoteSteps, talkingPoints } from "./Remote.tsx";

Object.assign(globalThis, { location: { origin: "http://localhost:8787", hostname: "localhost" } });

const remote = (state: RoomState, lastResults: RoundOutcome[] | null = null) =>
  renderToString(
    <RemotePanel state={state} localDeadline={null} lastResults={lastResults} offline={false} error={null} onCommand={() => {}} />,
  );

/** The big button's text. */
const primary = (markup: string) => markup.match(/remote__primary"[^>]*>([^<]*)</)?.[1];

describe("the phone remote (/host)", () => {
  it("the big button is the natural next step in each phase", () => {
    expect(primary(remote(room("lobby")))).toBe(S.tv.cmd.startNightShift);
    expect(primary(remote(room("briefing")))).toBe(S.tv.startRounds);
    expect(primary(remote(room("round", false, 2)))).toBe(S.tv.closeRound);
    expect(primary(remote(room("roundResult", false, 2)))).toBe(S.tv.nextRound);
    expect(primary(remote(room("strategy", false, 2)))).toBe(S.tv.cmd.startBatch);
    expect(primary(remote({ ...room("debrief", false, 3), debriefStep: 0 }))).toBe(S.tv.cmd.reportNext);
  });

  it("the other steps sit below; nothing to press with no players", () => {
    const lobby = remote(room("lobby"));
    expect(lobby).toContain(`>${S.tv.cmd.startStrategy}</button>`);
    expect(lobby).toContain(`>${S.tv.cmd.startBatch}</button>`);
    const empty = remote({ ...room("lobby"), players: [], pairs: [] });
    expect(primary(empty)).toBeUndefined();
    expect(empty).toContain(S.remote.noPlayers);
    // The report: Next until the last step, Back after the first.
    expect(remoteSteps({ ...room("debrief", false, 3), debriefStep: 3 })).toEqual(["reportBack"]);
  });

  it("Play / Pause and the closed speed menu; Reset sits behind a confirmation", () => {
    const markup = remote(room("round", false, 2));
    expect(markup).toContain(`aria-label="${S.tv.auto.playLabel}"`);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain(S.tv.auto.manualNote);
    expect(markup).toContain(`>${S.remote.reset}</button>`);
    expect(markup).not.toContain(S.remote.resetBody); // the sheet is closed
  });

  it("talking points follow the phase (Act I's rounds and the Act III lull have their own)", () => {
    expect(talkingPoints(room("round", false, 1))).toBe(S.remote.talk.act1Round);
    expect(talkingPoints(room("round", false, 2))).toBe(S.remote.talk.round);
    expect(talkingPoints(room("strategy", false, 3))).toBe(S.remote.talk.act3Strategy);
    expect(remote(room("ceiling", false, 2))).toContain(S.remote.talk.ceiling[0]);
  });

  it("the room: who is still choosing, then each pair's cause, never a sensor or a pump", () => {
    const s = room("round", false, 2);
    s.pairs[0]!.answered = { a: true, b: false };
    const round = remote(s);
    expect(round).toContain(S.remote.pairLine(1, S.tv.stillChoosing("Bo")));
    const result: RoundOutcome = { pairId: 1, win: false, x: 1, y: 1, a: 0, b: 0, cause: "overheat" } as RoundOutcome;
    const done = remote(room("roundResult", false, 2), [result]);
    expect(done).toContain(S.remote.pairLine(1, `✗ ${S.outcome.overheat.title}`));
    for (const markup of [round, done]) {
      for (const word of [S.light[0], S.light[1], S.pump[0], S.pump[1]]) expect(markup).not.toContain(word);
    }
  });
});

describe("the TV's remote pairing", () => {
  it("the dialog's QR and link go to /host with the room and its key, with the count and Unpair", () => {
    const url = remoteUrl("http://192.168.1.20:8787", "ABCD", "k3y");
    expect(url).toBe("http://192.168.1.20:8787/host?room=ABCD&key=k3y");
    const markup = renderToString(<RemotePairing url={url} remotes={1} onUnpair={() => {}} />);
    expect(markup).toContain(`data-remote-url="${url.replace("&", "&amp;")}"`);
    expect(markup).toContain(S.tv.remote.count(1));
    expect(markup).toContain(`>${S.tv.remote.unpair}</button>`);
  });

  it("the header's Remote button shows when a remote is connected", () => {
    const tv = (state: RoomState) => {
      Object.assign(useHost.getInitialState(), { state, status: "open", localDeadline: null, results: null, error: null });
      return renderToString(<Screen />);
    };
    expect(tv(room("lobby"))).toContain(`>${S.tv.remote.button}</button>`);
    expect(tv({ ...room("lobby"), remotes: 1 })).toContain(`>${S.tv.remote.connected(1)}</button>`);
  });
});
