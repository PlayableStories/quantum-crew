// The debug jump (key D, for testing), shared by the TV and solo (K1): straight to Act II's lull or Act III's tool
// reveal, never during a wave. The TV sends the room's debugAct2 / debugAct3; solo calls its store's debugJump.
import { S } from "../strings.ts";

export function DebugJumpPanel({
  inWave,
  blocked,
  onJump,
}: {
  inWave: boolean;
  /** No jump now (a wave, or the report). */
  blocked: boolean;
  onJump: (cmd: "debugAct2" | "debugAct3") => void;
}) {
  return (
    <div className="stack debug-jump">
      <h2>{S.tv.debug.title}</h2>
      <p className="muted small">{S.tv.debug.note}</p>
      {inWave && <p className="small">{S.tv.debug.inWave}</p>}
      {(["debugAct2", "debugAct3"] as const).map((cmd) => (
        <button key={cmd} type="button" className="btn" disabled={blocked} onClick={() => onJump(cmd)}>
          {S.tv.cmd[cmd]}
        </button>
      ))}
    </div>
  );
}
