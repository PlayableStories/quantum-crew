// The Act III / report copy review (2026-11-11): one pair of words for crystal directions (same / different), a TV
// question players can answer, hints that name the settings to move, the report's step 1 conclusion first (the CHSH
// mapping last, as small print) and no θ anywhere a player reads.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { answerText, hintText } from "../components/CrystalPlan.tsx";
import { Debrief } from "../solo/Debrief.tsx";
import { soloStore } from "../solo/soloStore.ts";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import { clueAnswer, weakestCase } from "../shared/crystalPlan.ts";
import type { RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { TvDebrief } from "./Screen.tsx";

/** Every string in S, with each function called on placeholder arguments (a function that throws on them is skipped). */
function allStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (typeof node === "function") {
    try {
      allStrings(node(...Array.from({ length: Math.max(node.length, 9) }, () => "X")), out);
    } catch {
      // A function that needs real arguments; the explicit checks below cover the ones that matter.
    }
  } else if (Array.isArray(node)) node.forEach((n) => allStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => allStrings(n, out));
  return out;
}

const deg = (greenDeg: number, redDeg: number) => ({ greenDeg, redDeg });

describe("one pair of words for crystal directions", () => {
  it("no player-facing string says 'match gap', 'differ gap', 'differ only' or θ", () => {
    const k = {
      sameRate: "75%", minGap: "0°", maxGap: "90°", line: "80%", matchGap: "22.5°", differGap: "67.5°",
      same: "85%", differ: "85%", rate: "85.4%", planA: "A", planB: "B",
    };
    const texts = [
      ...allStrings(S),
      ...[1, 2].flatMap((n) => S.remote.talk.clue(n, k)),
      ...S.remote.talk.rule(k),
      answerText(),
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/match gap|differ gap|differ only|θ/i);
    }
    expect(S.event.fan.needDiffer).toBe("different");
    expect(S.event.fan.chance("85%", "differ")).toBe("85% different");
  });

  it("the TV's Act III round asks a question players can answer", () => {
    expect(S.event.explain.round.question).toBe("Which case lets you down most often?");
  });

  it("the answer's numbers still come from the maths: 22.5°, 67.5°, 85.4%", () => {
    const k = clueAnswer();
    expect([k.matchGap, k.differGap]).toEqual([22.5, 67.5]);
    const text = answerText();
    expect(text).toContain("The three same gaps are 22.5° (85% the same) and the different gap is 67.5° (85% different): 85.4%.");
  });

  it("the fold line: settings repeat every 180°, with a computed example", () => {
    expect(S.event.crystalRule.fold("180°", "90°", "157.5°", "−22.5°")).toBe(
      "Settings repeat every 180°, so 157.5° is the same as −22.5°, and two settings are never more than 90° apart.",
    );
  });
});

describe("hints name the settings to move", () => {
  it("a 'same' case names both settings; both HOT names the HOT settings", () => {
    // A COOL 0°, B HOT 90°: the A COOL · B HOT case is 90° apart, the weakest.
    const same = { a: deg(0, 0), b: deg(0, 90) };
    expect(weakestCase(same.a, same.b)).toMatchObject({ x: 0, y: 1, need: "same" });
    expect(hintText(same)).toContain("bring A's COOL and B's HOT closer");
    // Every setting at 0°: both HOT never differs.
    const hot = { a: deg(0, 0), b: deg(0, 0) };
    expect(weakestCase(hot.a, hot.b)).toMatchObject({ x: 1, y: 1, need: "differ" });
    expect(hintText(hot)).toContain("different only 0% of the time");
    expect(hintText(hot)).toContain("Move your HOT settings further apart.");
  });

  it("the TV's hints lead with both tables' settings", () => {
    const same = { a: deg(0, 0), b: deg(0, 90) };
    expect(hintText(same, true)).toMatch(/^A COOL · B HOT, .*: bring closer\.$/);
    expect(hintText(same, true, null, true)).toBe("A COOL · B HOT: bring closer");
    expect(S.event.clues.tvHint("A COOL · B HOT", "same")).toBe("weakest A COOL · B HOT: bring closer");
  });

  it("with CORA, only the player's own setting is named", () => {
    // The player at A (COOL 45°, HOT 0°), CORA at B on her fixed plan.
    const plans = { a: deg(45, 0), b: OPTIMAL_TUNING.B };
    const w = weakestCase(plans.a, plans.b);
    const human = { table: "A" as const, name: "Ada" };
    const mine = S.light[w.x];
    for (const text of [hintText(plans, false, human), hintText(plans, true, human), hintText(plans, true, human, true)]) {
      expect(text).toContain(mine);
      expect(text).not.toMatch(/\b[AB]'s /);
    }
  });
});

describe("the incident report", () => {
  it("step 1 opens with the Bell inequality in both modes; the CHSH mapping is the small print, last", () => {
    for (const step of [S.debrief.steps[0]!, S.event.report.steps[0]!]) {
      expect(step.body[0]).toContain("Bell inequality");
      expect(step.body.join(" ")).not.toContain("CHSH game");
      expect("foot" in step && step.foot).toContain("Under the station is the CHSH game");
    }
    const s: RoomState = { ...room("debrief", false, 3), debriefStep: 0 };
    const tv = renderToString(<TvDebrief state={s} onCommand={() => {}} />);
    const bell = tv.indexOf("Bell inequality");
    const chsh = tv.indexOf("Under the station is the CHSH game");
    expect(bell).toBeGreaterThan(-1);
    expect(chsh).toBeGreaterThan(tv.lastIndexOf("Mixing plans at random"));
    expect(tv).toContain("tv__debrief-foot");

    soloStore.setState({ phase: "debrief", debriefStep: 0 } as never);
    const solo = renderToString(<Debrief />);
    expect(solo.indexOf("Under the station is the CHSH game")).toBeGreaterThan(solo.lastIndexOf("Mixing plans at random"));
    expect(solo).toContain("debrief__foot");
  });

  it("step 2 talks about the gap, not θ; step 3 says what changed", () => {
    for (const steps of [S.debrief.steps, S.event.report.steps]) {
      expect(steps[1]!.body[0]).toBe(
        "The two crystals were a pair of entangled qubits. When the gap between their settings is g, they give the same direction cos²(g) of the time: that's the gap table you played with.",
      );
      expect(steps[1]!.body.join(" ")).toContain("85.4%");
      expect(steps[2]!.body).toContain(
        "What the crystals changed is only how often your two results matched. That is what no-signalling means.",
      );
    }
  });

  it("the comparison panel names who plays the best plan", () => {
    expect(S.event.report.compare.plan).toBe("Best plan: both always clockwise");
    expect(S.debrief.compare.plan).toBe("Best plan: you and CORA both always clockwise");
  });
});
