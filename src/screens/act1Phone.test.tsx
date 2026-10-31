// Event Act I on a phone (server-rendered, no browser): the radio names the partner, or lets CORA speak her own line;
// the storm breaks up mid-line (the station log for a human partner); a result shows its cause and both sections.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { usePlayer } from "../net/playerStore.ts";
import type { RoomPhase, RoomState, RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { Play } from "./Play.tsx";

const rate = { rounds: 0, wins: 0, timeouts: 0 };
const esc = (text: string) => text.replace(/'/g, "&#x27;");

/** Ada at Table A, paired with Bo (or CORA when `bot`). */
function room(phase: RoomPhase, bot = false): RoomState {
  return {
    room: "ABCD",
    phase,
    act: 1,
    batchNo: 0,
    roundNo: 1,
    batchSize: 12,
    deadline: null,
    serverNow: 0,
    players: [
      { id: "ada", name: "Ada", table: "A", connected: true, pairId: 1 },
      ...(bot ? [] : [{ id: "bo", name: "Bo", table: "B" as const, connected: true, pairId: 1 }]),
    ],
    pairs: [
      {
        id: 1,
        a: { playerId: "ada", name: "Ada" },
        b: bot ? { playerId: null, name: S.crew.name } : { playerId: "bo", name: "Bo" },
        act1: rate,
        act2: rate,
        act3: rate,
        answered: { a: false, b: false },
      },
    ],
    stability: { rolling: null, act1: rate, act2: rate, act3: rate },
    lastBatch: null,
    ceilingRevealed: false,
    toolUnlocked: false,
    marginals: null,
  };
}

const html = () => renderToString(<Play />);

type PlayerState = ReturnType<typeof usePlayer.getState>;
/** Server rendering reads the store's initial state, so the test writes there (and to the live state). */
function put(patch: Partial<PlayerState>) {
  Object.assign(usePlayer.getInitialState(), patch);
  usePlayer.setState(patch);
}

function seat(state: RoomState) {
  put({ seat: { room: "ABCD", name: "Ada", table: "A" }, playerId: "ada", status: "open", state });
}

const live = (partner: { light: 0 | 1; pump: 0 | 1 | null }, answered: 0 | 1 | null = null) => ({
  roundId: "act1-1",
  act: 1 as const,
  light: 0 as const,
  ms: 8000,
  dialDeg: null,
  answered,
  measuring: false,
  partner,
});

beforeEach(() => put({ round: null, flash: null }));

describe("Act I on a phone", () => {
  it("a human partner: the radio reports their reading, then their pump, by name", () => {
    seat(room("round"));
    put({ round: live({ light: 1, pump: null }) });
    expect(html()).toContain(S.event.radio.reads("Bo", 1));
    expect(html()).toContain(esc(S.event.radio.noPump("Bo")));
    put({ round: live({ light: 1, pump: 0 }, 1) });
    const markup = html();
    expect(markup).toContain(S.event.radio.turning("Bo", 0));
    // The pump stays changeable, with the current choice marked.
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(S.phone.act1Change);
  });

  it("CORA: her own line, reading and direction", () => {
    seat(room("round", true));
    put({ round: live({ light: 0, pump: 1 }) });
    expect(html()).toContain(S.crew.reading(0, 1));
  });

  it("the storm breaks the radio mid-line: the station log with a human partner, CORA with her", () => {
    seat(room("storm"));
    expect(html()).toContain(S.event.storm.logBreak);
    expect(html()).toContain("radio-line--interference");
    seat(room("storm", true));
    expect(html()).toContain(esc(S.crew.stormBreak));
  });

  it("a result shows its cause and names both sections", () => {
    seat(room("roundResult"));
    const flash: { roundId: string } & RoundOutcome = {
      roundId: "act1-1",
      pairId: 1,
      win: true,
      timedOut: false,
      x: 1,
      y: 1,
      a: 0,
      b: 1,
      cause: "purge",
    };
    put({ flash });
    const markup = html();
    expect(markup).toContain(S.outcome.purge.title);
    expect(markup).toContain(S.event.ringSide("A", S.event.you));
    expect(markup).toContain(S.event.ringSide("B", "Bo"));
  });
});
