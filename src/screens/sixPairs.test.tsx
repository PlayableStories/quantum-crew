// P6, five or six pairs (server-rendered, no browser): the TV's pair cards go dense, wave done shows one compact row per
// pair in both acts (the four-case grids stay up to four pairs), the Act III lull's hints go one line each, and each
// phone shows its own pair's four cases after a wave.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_PAIRS } from "../config.ts";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import type { RoomState, RoundOutcome } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { always, put, room, seat } from "./eventFixture.ts";
import { Play } from "./Play.tsx";
import { RemotePanel } from "./Remote.tsx";
import { CrystalLull, CrystalWave, WaveCases } from "./Screen.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;");
const revHot = { onGreen: 0, onRed: 1 } as const;
const zero = { greenDeg: 0, redDeg: 0 };

/** A room of `n` pairs after a wave, in act `act`: pair 1 at the answer (Act III), the rest at their defaults. */
function crowd(n: number, act: 2 | 3, phase: RoomState["phase"] = "batchDone"): RoomState {
  const s = room(phase, false, act);
  s.clue = act === 3 ? 1 : 0;
  s.pairs = Array.from({ length: n }, (_, i) => ({
    ...s.pairs[0]!,
    id: i + 1,
    a: { playerId: `a${i}`, name: `A${i + 1}` },
    b: { playerId: `b${i}`, name: `B${i + 1}` },
    locked: { a: always, b: revHot },
    lastWave: { rounds: 8, wins: 6, timeouts: 0 },
    dials: i === 0 ? { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } : { a: zero, b: zero },
    lockedDials: i === 0 ? { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } : { a: zero, b: zero },
  }));
  return s;
}

const count = (markup: string, cls: string) => markup.split(`class="${cls}`).length - 1;

describe("wave done on the TV by room size", () => {
  it("Act II: four-case grids up to four pairs, one compact row each from five", () => {
    const four = renderToString(<WaveCases state={crowd(4, 2)} />);
    expect(count(four, "panel stack tv__pair-cases")).toBe(4);
    expect(four).not.toContain("tv__pair-row");
    const six = renderToString(<WaveCases state={crowd(MAX_PAIRS, 2)} />);
    expect(count(six, "panel tv__pair-row")).toBe(MAX_PAIRS);
    expect(six).toContain("tv__cases--compact");
    expect(six).not.toContain('class="case ');
    expect(six).toContain(esc(S.event.compact.head));
    // Always clockwise × reverse when HOT loses exactly COOL · HOT (B reverses alone; the vent stays locked).
    expect(six.split(S.event.compact.loses(`${S.light[0]} · ${S.light[1]}`)).length - 1).toBe(MAX_PAIRS);
  });

  it("Act III: compact rows with found it, or the weakest case and which way to move", () => {
    const six = renderToString(<CrystalWave state={crowd(MAX_PAIRS, 3)} />);
    expect(count(six, "panel tv__pair-row")).toBe(MAX_PAIRS);
    expect(six).not.toContain('class="case ');
    expect(six.split(S.event.wave3.foundIt).length - 1).toBe(1);
    const hint = S.event.clues.tvHint(`A ${S.light[1]} · B ${S.light[1]}`, "differ");
    expect(six.split(esc(hint)).length - 1).toBe(MAX_PAIRS - 1);
  });

  it("the Act III lull lists every pair's hint, one line each from five pairs", () => {
    const six = renderToString(<CrystalLull state={crowd(MAX_PAIRS, 3, "strategy")} />);
    expect(six).toContain("clues--dense");
    for (let id = 1; id <= MAX_PAIRS; id++) expect(six).toContain(`Pair ${id} ·`);
    // One short line each: the case and which way to move (the gap and chance are on the pair's phones).
    expect(six.split(S.event.clues.denseHint("A HOT · B HOT", "differ")).length - 1).toBe(MAX_PAIRS - 1);
    expect(renderToString(<CrystalLull state={crowd(4, 3, "strategy")} />)).not.toContain("clues--dense");
  });
});

describe("a phone after a wave shows its own pair's four cases", () => {
  beforeEach(() => put({ round: null, flash: null }));

  it("Act II and Act III", () => {
    const two = room("batchDone", false, 2);
    two.pairs[0] = { ...two.pairs[0]!, locked: { a: always, b: revHot } };
    seat(two);
    let markup = renderToString(<Play />);
    expect(markup).toContain(esc(S.event.phoneCases.order("Ada", "Bo")));
    expect(count(markup, "case case--")).toBe(4);

    const three = room("batchDone", false, 3);
    three.pairs[0] = { ...three.pairs[0]!, lockedDials: { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B } };
    seat(three);
    markup = renderToString(<Play />);
    expect(markup).toContain(esc(S.event.phoneCases.head));
    expect(count(markup, "case case--")).toBe(4);
  });
});

describe("the remote with six pairs", () => {
  const remote = (state: RoomState, lastResults: RoundOutcome[] | null = null) =>
    renderToString(
      <RemotePanel state={state} localDeadline={null} lastResults={lastResults} offline={false} error={null} onCommand={() => {}} />,
    );

  it("one line per pair in a round, a result and the lull, with the tighter spacing from five pairs", () => {
    const round = crowd(MAX_PAIRS, 2, "round");
    const markup = remote(round);
    expect(markup).toContain("remote--many");
    for (let id = 1; id <= MAX_PAIRS; id++) expect(markup).toContain(`Pair ${id}:`);
    const results: RoundOutcome[] = round.pairs.map((p) => ({ pairId: p.id, win: true, timedOut: false, x: 0, y: 0, a: 0, b: 0, cause: "circulate" }));
    expect(remote(crowd(MAX_PAIRS, 2, "roundResult"), results).split("remote__line--win").length - 1).toBe(MAX_PAIRS);
    expect(remote(crowd(MAX_PAIRS, 2, "strategy")).split("<li").length - 1).toBeGreaterThanOrEqual(MAX_PAIRS);
    expect(remote(crowd(4, 2, "round"))).not.toContain("remote--many");
  });
});
