// The phone header's status (U1): a short line naming the room's phase for this player, always shown, so a phone
// never needs to send anyone to the TV. Pure, so tests cover every phase.
import type { RoomPhase, RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";

type Me = {
  /** This player has a pair (a seat in the room's pairing). */
  seated: boolean;
  /** A live round on this phone, and whether this player has set a pump in it. */
  round: { act: 1 | 2 | 3; answered: boolean } | null;
};

export function phoneStatus(state: Pick<RoomState, "phase" | "act" | "batchNo" | "roundNo">, me: Me): string {
  const P = S.phone.phase;
  const phase: RoomPhase = state.phase;
  if (phase === "lobby") return P.lobby;
  if (!me.seated) return P.waitingSeat;
  const act1 = state.act === 1;
  switch (phase) {
    case "briefing":
      return P.briefing;
    case "storm":
      return P.storm;
    case "strategy":
      return P.lull;
    case "round":
      if (me.round) {
        if (act1) return P.act1Round(state.roundNo);
        return P.waveRound(state.batchNo, state.roundNo, me.round.answered);
      }
      return act1 ? P.act1Next : P.waveNext(state.batchNo);
    case "roundResult":
      return act1 ? P.act1Next : P.waveNext(state.batchNo);
    case "batchDone":
      return act1 ? P.act1Done : P.wavePassed(state.batchNo);
    case "ceiling":
      return P.ceiling;
    case "tool":
      return P.tool;
    case "resolution":
      return P.resolution;
    case "debrief":
      return P.debrief;
  }
}
