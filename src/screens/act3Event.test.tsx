// Event Act III (server-rendered, no browser): the supply pod, a round (the crystal's suggestion → your pump; no
// MEASURE) and a result with its cause; the TV's tool panel and wave done. The crystal plan card: crystalPlan.test.tsx.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { RoomState, RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { CrystalWave, ToolPanel } from "./Screen.tsx";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";

const esc = (text: string) => text.replace(/'/g, "&#x27;");
const html = () => renderToString(<Play />);

/** The room in Act III, Bo (or CORA) at 22.5° / 157.5°. */
function act3(phase: RoomState["phase"], bot = false): RoomState {
  const s = room(phase, bot, 3);
  s.toolUnlocked = s.ceilingRevealed = true;
  s.pairs[0] = { ...s.pairs[0]!, dials: { a: { greenDeg: 0, redDeg: 45 }, b: { greenDeg: 22.5, redDeg: 157.5 } } };
  return s;
}

const live = (crystal: 0 | 1 | null) => ({
  roundId: "2-1",
  act: 3 as const,
  light: 0 as const,
  ms: 7000,
  dialDeg: 0,
  answered: null,
  partner: null,
  crystal,
});

beforeEach(() => put({ round: null, flash: null }));

describe("Act III on a phone", () => {
  it("the tool reveal: engineering's note, and what the crystals do to a plan", () => {
    seat(act3("tool"));
    const markup = html();
    expect(markup).toContain(esc(S.event.pod.lines[1]!)); // engineering's note
    expect(markup).toContain(esc(S.event.pod.lines[2]!)); // they change what a plan can say
    expect(markup).toContain(`>${S.event.crystalRule.chip}</button>`);
  });

  it("a round: no MEASURE (the room measured); the crystal's suggestion, tagged on its pump, and both pumps", () => {
    seat(act3("round"));
    put({ round: live(1) });
    const markup = html();
    expect(markup).not.toContain(`>${S.batch.measure}</button>`);
    expect(markup).toContain(S.event.chain.crystal);
    expect(markup).toContain(S.pump[1]);
    expect(markup).toContain(S.batch.follow);
    expect(markup.match(/class="btn pumpbtn/g)).toHaveLength(2);
    expect(markup.match(/pumpbtn--suggested/g)).toHaveLength(1);
    expect(markup).toContain(`>${S.batch.crystalTag}</span>`);
  });

  it("a result: the headline, one why line and the ring (labelled with both sides)", () => {
    seat(act3("roundResult"));
    const flash: { roundId: string } & RoundOutcome = {
      roundId: "2-1",
      pairId: 1,
      win: true,
      timedOut: false,
      x: 0,
      y: 1,
      a: 0,
      b: 0,
      cause: "carry",
    };
    put({ flash });
    const markup = html();
    expect(markup).toContain(S.outcome.carry.title);
    expect(markup.match(/class="why"/g)).toHaveLength(1);
    expect(markup).not.toContain("Station telemetry");
    expect(markup).toContain(
      S.ring.result(S.event.ringSide("A", S.event.you), "COOL", S.pump[0], S.event.ringSide("B", "Bo"), "HOT", S.pump[0], S.ring.ventLocked),
    );
    expect(markup).toContain(S.event.ringSide("B", "Bo"));
  });
});

describe("Act III on the TV", () => {
  /** Wave done: pair 1 at the best dials (≈ 85.4%), pair 2 at 0° for both against Bo's 90° (25%). */
  function waveDone(crewRate: number, saved: boolean): RoomState {
    const s = act3("batchDone");
    const zero = { greenDeg: 0, redDeg: 0 };
    s.pairs[0] = { ...s.pairs[0]!, lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B }, lastWave: { rounds: 12, wins: 10, timeouts: 0 }, followed: { n: 20, of: 24 } };
    s.pairs.push({
      ...s.pairs[0]!,
      id: 2,
      a: { playerId: "cy", name: "Cy" },
      b: { playerId: "di", name: "Di" },
      lockedDials: { a: zero, b: { greenDeg: 90, redDeg: 90 } },
      followed: { n: 24, of: 24 },
    });
    return { ...s, crewDialsRate: crewRate, stationSaved: saved, act3Followed: { n: 44, of: 48 } };
  }

  it("the tool reveal: the supply pod and engineering's note", () => {
    const markup = renderToString(<ToolPanel />);
    expect(markup).toContain(S.event.pod.kicker);
    for (const line of S.event.pod.lines) expect(markup).toContain(esc(line));
  });

  it("after a wave: each pair's crystal cases and true rate, the 80% pairs highlighted, who followed", () => {
    const markup = renderToString(<CrystalWave state={waveDone(0.552, false)} />);
    expect(markup.match(/tv__pair-cases--holds/g)).toHaveLength(1);
    expect(markup).toContain(S.readout.trueRate("85.4%"));
    expect(markup).toContain(S.readout.trueRate("25.0%"));
    expect(markup).not.toContain(S.event.wave3.followed(20, 24)); // the crew line keeps the followed count
    expect(markup).toContain(S.event.wave3.crewFollowed(44, 48));
    expect(markup).toContain(S.event.wave3.pairPlans("Ada", "0° / 45°", "Bo", "22.5° / 157.5°"));
  });

  it("saved or not: the crew's crystal plans average, 80% or more holds", () => {
    expect(renderToString(<CrystalWave state={waveDone(0.552, false)} />)).toContain(esc(S.event.wave3.notSaved("55.2%")));
    const saved = renderToString(<CrystalWave state={waveDone(0.854, true)} />);
    expect(saved).toContain(esc(S.event.wave3.saved("85.4%")));
    expect(saved).toContain("tv__crew-line--saved");
  });
});
