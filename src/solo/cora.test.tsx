// CORA, the solo crewmate (server-rendered, no browser): her name and AI badge wherever she appears, copy that says
// she is an AI, and readout lines that state only the facts of the round.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SeatName } from "../components/AiBadge.tsx";
import { BATCH_SIZE, ACT3_ROUND_MS } from "../config.ts";
import { scoreRound } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { act2Reactions } from "./crew.ts";
import { Solo } from "./Solo.tsx";
import { soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const s = () => soloStore.getState();
const html = () => renderToString(<Solo />);
/** CORA's name immediately followed by her AI badge. */
const NAME_AND_BADGE = new RegExp(`${S.crew.name}<span class="ai-badge">`);

soloStore.getInitialState = soloStore.getState;

describe("CORA", () => {
  beforeEach(() => s().reset());

  it("is CORA, with her AI badge on the radio, the huddle's pair line and tuning", () => {
    expect(S.crew.name).toBe("CORA");
    toHuddle(s);
    const huddle = html();
    expect(huddle.match(new RegExp(NAME_AND_BADGE, "g"))!.length).toBeGreaterThanOrEqual(2); // radio + pair line
    let now = 0;
    s().beginBatch();
    for (let i = 0; i < BATCH_SIZE; i++) {
      s().advance(now);
      now += ACT3_ROUND_MS + 1;
      s().timeout(now);
    }
    s().advance(now);
    s().reportCeiling();
    s().revealTool();
    s().openTool();
    const tuning = html();
    expect(tuning).toMatch(new RegExp(`${NAME_AND_BADGE.source}[^]*${S.crew.dialsLine("22.5°", "157.5°")}`));
  });

  it("the landing and intro introduce her as the station's AI, not a person", () => {
    expect(S.landing.soloSub).toContain("CORA");
    const intro = S.intro.lines.join(" ");
    expect(intro).toContain("CORA, the station's Coolant Ring Assistant");
    expect(intro).toContain("not a person");
    expect(JSON.stringify(S)).not.toMatch(/an AI crewmate|Your crewmate, an AI|CREWMATE_NAME/);
  });

  it("event mode: a bot seat shows the badge, a person doesn't", () => {
    expect(renderToString(<SeatName name="CORA" bot />)).toContain("ai-badge");
    expect(renderToString(<SeatName name="Ada" bot={false} />)).not.toContain("ai-badge");
  });
});

describe("readout lines state only the facts", () => {
  it("names who was hot or cool when the pumps fought, never who reversed or whose fault it was", () => {
    const fought = [
      scoreRound(HOT, COOL, ANTICLOCKWISE, CLOCKWISE),
      scoreRound(COOL, HOT, CLOCKWISE, ANTICLOCKWISE),
      scoreRound(COOL, COOL, CLOCKWISE, ANTICLOCKWISE),
    ];
    const lines = fought.map((r) => act2Reactions([r])[0]!);
    expect(lines).toEqual([S.crew.readout.hotCool(1), S.crew.readout.coolHot(1), S.crew.readout.bothCool(1)]);
    expect(lines[0]).toBe("Round 1: you were hot, I was cool, and our pumps fought.");
    for (const line of Object.values(S.crew.readout).map((l) => (typeof l === "function" ? l(7) : l))) {
      expect(line).not.toMatch(/reversed|on me|not luck/i);
    }
  });

  it("CORA's Act III lines don't claim anyone knows the right settings", () => {
    expect(S.crew.tuning).not.toMatch(/engineering|sheet|what works/i);
    expect(S.crew.tuning).toMatch(/crystal settles/);
    expect(S.crew.tool).not.toMatch(/your business/);
  });
});
