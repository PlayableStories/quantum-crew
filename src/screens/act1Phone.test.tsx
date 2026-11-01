// Event Act I on a phone (server-rendered, no browser): the radio names the partner, or lets CORA speak her own line;
// the storm breaks up mid-line (the station log for a human partner); a result shows its cause and both sections.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);

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
