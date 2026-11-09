// Solo's keyboard shortcuts (K1; the map is src/lib/keys.ts, shared with the TV): Space / Enter press the highlighted
// button outside a wave (rounds keep their own keys in Batch.tsx), M mute, F full screen, D the debug jump (Act II's
// lull or Act III's tool reveal), ? the shortcut sheet (also from the header's ? button).
import { useCallback, useEffect } from "react";
import { useSound } from "../audio/sfx.ts";
import { DebugJumpPanel } from "../components/DebugJumpPanel.tsx";
import { KeysSheet } from "../components/KeysSheet.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { toggleFullscreen } from "../lib/fullscreen.ts";
import { keyAction, keyTarget, useKeySheet } from "../lib/keys.ts";
import { S } from "../strings.ts";
import { useSolo, type Phase } from "./soloStore.ts";

const WAVES: Phase[] = ["act1Batch", "act2Batch", "act3Batch"];

export function SoloKeys() {
  const phase = useSolo((s) => s.phase);
  const debugJump = useSolo((s) => s.debugJump);
  const toggleMute = useSound((s) => s.toggle);
  const open = useKeySheet((s) => s.open);
  const setOpen = useKeySheet((s) => s.set);
  const close = useCallback(() => setOpen(null), [setOpen]);
  const inWave = WAVES.includes(phase);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = keyAction(e, "solo", keyTarget(e.target), inWave);
      if (!action) return;
      if (action === "primary") {
        // The screen's highlighted button in the ActionBar (Next, Lock in, The storm passes…).
        const primary = document.querySelector<HTMLButtonElement>(".action-bar .btn--primary:not(:disabled)");
        if (!primary) return;
        e.preventDefault();
        return primary.click();
      }
      e.preventDefault();
      const current = useKeySheet.getState().open;
      if (action === "debug") setOpen(current === "debug" ? null : "debug");
      else if (action === "help") setOpen(current === "help" ? null : "help");
      else if (action === "fullscreen") toggleFullscreen();
      else if (action === "mute") toggleMute("solo");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inWave, setOpen, toggleMute]);

  return (
    <>
      <KeysSheet mode="solo" open={open === "help"} onClose={close} />
      <Sheet open={open === "debug"} onClose={close} label={S.tv.debug.title}>
        <DebugJumpPanel
          inWave={inWave}
          blocked={inWave || phase === "debrief"}
          onJump={(cmd) => {
            debugJump(cmd === "debugAct2" ? 2 : 3);
            close();
          }}
        />
      </Sheet>
    </>
  );
}
