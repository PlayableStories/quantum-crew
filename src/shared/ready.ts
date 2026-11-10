// The lull's readiness (R1), read from the room's own flags: the server decides who is ready (CORA's seat always is);
// this only counts and names, for the TV, the remote and the phones. Pure, so tests cover it.
import type { PairInfo, RoomState } from "./protocol.ts";

/** A pair is ready only when both seats are. */
export const pairReady = (pair: Pick<PairInfo, "ready">) => pair.ready.a && pair.ready.b;

/** How many pairs are ready, of how many. */
export function readyPairs(state: Pick<RoomState, "pairs">): { ready: number; total: number; planning: number } {
  const ready = state.pairs.filter(pairReady).length;
  return { ready, total: state.pairs.length, planning: state.pairs.length - ready };
}

/** A pair's lull state: both ready, one (named), or still planning. */
export type LullState = { kind: "both" } | { kind: "one"; name: string } | { kind: "planning" };

export function lullState(pair: Pick<PairInfo, "ready" | "a" | "b">): LullState {
  if (pair.ready.a && pair.ready.b) return { kind: "both" };
  if (pair.ready.a) return { kind: "one", name: pair.a.name };
  if (pair.ready.b) return { kind: "one", name: pair.b.name };
  return { kind: "planning" };
}
