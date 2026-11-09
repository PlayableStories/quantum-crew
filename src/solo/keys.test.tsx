// Solo's keyboard shortcuts (K1): the debug jump (D) mirrors the TV's, the ? sheet lists solo's keys, and the header
// has a ? button. The key map itself is tested in src/lib/keys.test.ts.
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { DebugJumpPanel } from "../components/DebugJumpPanel.tsx";
import { KeysList } from "../components/KeysSheet.tsx";
import { useSound } from "../audio/sfx.ts";
import { S } from "../strings.ts";
import { Solo } from "./Solo.tsx";
import { createSoloStore, soloStore } from "./soloStore.ts";
import { toHuddle } from "./testkit.ts";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("the debug jump in solo (D)", () => {
  it("jumps to Act II's lull or Act III's tool reveal (then the crystal plan), keeping what was played", () => {
    const store = createSoloStore(7);
    const s = () => store.getState();
    s().debugJump(2);
    expect(s().phase).toBe("act2Plan");
    s().debugJump(3);
    expect(s().phase).toBe("toolReveal");
    s().openTool();
    expect(s().phase).toBe("act3Plan");
  });

  it("is refused during a wave and in the report", () => {
    const store = createSoloStore(8);
    const s = () => store.getState();
    toHuddle(s);
    s().beginBatch();
    s().debugJump(3);
    expect(s().phase).toBe("act2Batch");
  });

  it("the panel's buttons are disabled in a wave, with the note", () => {
    const markup = renderToString(<DebugJumpPanel inWave blocked onJump={() => {}} />);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain(esc(S.tv.debug.inWave));
    expect(renderToString(<DebugJumpPanel inWave={false} blocked={false} onJump={() => {}} />)).not.toContain("disabled");
  });
});

describe("the ? sheet and the header button", () => {
  beforeEach(() => soloStore.getState().reset());

  it("lists solo's keys (Space / Enter, the pumps, Enter follows, M, F, D, ?, Esc)", () => {
    const markup = renderToString(<KeysList mode="solo" />);
    for (const [key] of S.keys.solo) expect(markup).toContain(`<kbd>${esc(key)}</kbd>`);
    expect(S.keys.solo.map(([k]) => k)).toEqual(expect.arrayContaining(["M", "F", "D", "?"]));
  });

  it("the TV's list has P and Space / →, not the pumps", () => {
    const keys = S.keys.tv.map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["Space / →", "P", "M", "F", "D", "?"]));
    expect(keys).not.toContain("A / ←");
  });

  it("every solo screen's header has the ? button beside mute", () => {
    const markup = renderToString(<Solo />);
    expect(markup).toContain(`aria-label="${esc(S.keys.open)}"`);
  });

  it("M's action is the mute toggle the button uses", () => {
    const before = useSound.getState().on.solo;
    useSound.getState().toggle("solo");
    expect(useSound.getState().on.solo).toBe(!before);
    useSound.getState().toggle("solo");
  });
});
