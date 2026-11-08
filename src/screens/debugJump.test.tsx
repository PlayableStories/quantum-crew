// The TV's debug jump (key D, for testing): two buttons, disabled during a wave; never in the host row or the remote.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { S } from "../strings.ts";
import { room } from "./eventFixture.ts";
import { nextSteps } from "./hostSteps.tsx";
import { remoteSteps } from "./Remote.tsx";
import { DebugJump } from "./Screen.tsx";

const esc = (text: string) => text.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("the debug jump", () => {
  it("offers Act II's lull and Act III's tool reveal", () => {
    const markup = renderToString(<DebugJump state={room("strategy", false, 2)} onJump={() => {}} />);
    expect(markup).toContain(esc(S.tv.cmd.debugAct2));
    expect(markup).toContain(esc(S.tv.cmd.debugAct3));
    expect(markup).not.toContain("disabled");
  });

  it("is disabled during a round, with a note", () => {
    const markup = renderToString(<DebugJump state={room("round", false, 2)} onJump={() => {}} />);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain(esc(S.tv.debug.inWave));
  });

  it("is never a host-row or remote step", () => {
    for (const phase of ["lobby", "strategy", "batchDone", "tool"] as const) {
      const s = room(phase, false, 2);
      expect(nextSteps(s)).not.toContain("debugAct2");
      expect(remoteSteps(s)).not.toContain("debugAct3");
    }
  });
});
