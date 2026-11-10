// A pair's state in the lull (R1), worded once for the TV's pair cards, the Act III hint rows and the remote:
// "Planning", "<name> ready" or "✓ Ready". Read from the room's flags (src/shared/ready.ts).
import { lullState } from "../shared/ready.ts";
import type { PairInfo } from "../shared/protocol.ts";
import { S } from "../strings.ts";

export function lullText(pair: Pick<PairInfo, "ready" | "a" | "b">): string {
  const st = lullState(pair);
  const R = S.event.ready;
  return st.kind === "both" ? `✓ ${R.both}` : st.kind === "one" ? R.one(st.name) : R.planning;
}

export function ReadyTag({ pair }: { pair: Pick<PairInfo, "ready" | "a" | "b"> }) {
  return <span className={`ready-tag ready-tag--${lullState(pair).kind}`}>{lullText(pair)}</span>;
}
