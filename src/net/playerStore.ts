// A phone's connection: joins a room at a table, receives only its own sensor reading, and sends pump intents (`player:valve` on the wire).
import { create } from "zustand";
import type { ClassicalStrategy, Light, Table, TuningConfig, Valve } from "../shared/chsh.ts";
import type { Act, PartnerCall, RoomState, RoundOutcome } from "../shared/protocol.ts";
import { DEFAULT_PLAN, DEFAULT_TUNING } from "../config.ts";
import { toLocalDeadline } from "./useCountdown.ts";
import { connectStation, session, type SocketStatus, type Station } from "./socket.ts";

const KEY = "qc-player";

export type Seat = { room: string; name: string; table: Table };

/**
 * `answered`: the pump direction this phone set (Acts I and II; Act I can change it until the round ends) or got back
 * from the room's measurement (Act III). `partner`: Act I's radio.
 */
type LiveRound = {
  roundId: string;
  act: Act;
  light: Light;
  /** Null in a Guided round: no countdown. */
  ms: number | null;
  dialDeg: number | null;
  answered: Valve | null;
  partner: PartnerCall | null;
  /** Act III: what the crystal said, measured by the room at round start at this player's planned setting
   *  (`dialDeg`). A suggestion: the pump is still the player's to set. */
  crystal: Valve | null;
};

type PlayerStore = {
  status: SocketStatus | "idle";
  seat: Seat | null;
  playerId: string | null;
  state: RoomState | null;
  localDeadline: number | null;
  round: LiveRound | null;
  /** The last round's result for this phone's pair (shown until the next round starts). */
  flash: ({ roundId: string } & RoundOutcome) | null;
  plan: ClassicalStrategy;
  tuning: TuningConfig;
  error: string | null;
  join(seat: Seat): void;
  resume(): boolean;
  answer(valve: Valve): void;
  followCrystal(): void;
  setPlan(plan: ClassicalStrategy): void;
  setTuning(tuning: TuningConfig): void;
  /** The lull (R1): say this player is ready, or (false) planning again. The room holds the flag (pair.ready). */
  setReady(ready: boolean): void;
  leave(): void;
};

let station: Station | null = null;

export const usePlayer = create<PlayerStore>()((set, get) => ({
  status: "idle",
  seat: null,
  playerId: null,
  state: null,
  localDeadline: null,
  round: null,
  flash: null,
  plan: DEFAULT_PLAN,
  tuning: DEFAULT_TUNING,
  error: null,

  join(seat) {
    station?.close();
    set({ seat, error: null, status: "connecting" });
    station = connectStation({
      onStatus: (status) => set({ status }),
      hello: (send) => {
        send({ type: "player:join", ...seat });
        // Re-send this phone's choices so a reconnect (or a server restart mid-session) keeps them.
        const { plan, tuning } = get();
        send({ type: "player:strategy", act: 2, classical: plan });
        send({ type: "player:strategy", act: 3, tuning });
      },
      onMessage: (msg) => {
        switch (msg.type) {
          case "player:joined":
            session.set(KEY, seat);
            return set({ playerId: msg.playerId, seat: { ...seat, name: msg.name } });
          case "room:state": {
            const inRound = msg.state.phase === "round" || msg.state.phase === "roundResult";
            // After a host reset the server forgets plans and dials; forget them here too.
            const fresh = msg.state.phase === "lobby" && msg.state.batchNo === 0;
            return set({
              ...(fresh ? { plan: DEFAULT_PLAN, tuning: DEFAULT_TUNING } : {}),
              state: msg.state,
              localDeadline: toLocalDeadline(msg.state.deadline, msg.state.serverNow),
              ...(inRound ? {} : { round: null }),
            });
          }
          case "round:start":
            return set({
              round: {
                roundId: msg.roundId,
                act: msg.act,
                light: msg.light,
                ms: msg.deadline === null ? null : Math.max(0, msg.deadline - msg.serverNow),
                dialDeg: msg.dialDeg ?? null,
                answered: msg.pump ?? null,
                partner: msg.partner ?? null,
                crystal: msg.crystal ?? null,
              },
              flash: null,
            });
          case "round:partner": {
            const { round } = get();
            if (round?.roundId === msg.roundId && round.partner)
              set({ round: { ...round, partner: { ...round.partner, pump: msg.pump } } });
            return;
          }
          case "round:result": {
            const { type: _, ...outcome } = msg;
            return set({ round: null, flash: outcome });
          }
          case "error":
            if (msg.code === "no-room" || msg.code === "table-full") {
              station?.close();
              station = null;
              session.remove(KEY);
              return set({ error: msg.message, seat: null, status: "idle", playerId: null });
            }
            return set({ error: msg.message });
        }
      },
    });
  },

  /** Rejoins the seat saved in this tab (after a reload). */
  resume() {
    const saved = session.get<Seat>(KEY);
    if (!saved) return false;
    get().join(saved);
    return true;
  },

  answer(valve) {
    const { round } = get();
    // Act I: the last tap counts, so a different pump is sent again. Acts II and III: the first tap counts.
    if (!round || round.answered === valve || (round.act !== 1 && round.answered !== null)) return;
    station?.send({ type: "player:valve", roundId: round.roundId, valve });
    set({ round: { ...round, answered: valve } });
  },

  /** Act III: set the pump the crystal suggested. */
  followCrystal() {
    const { round, answer } = get();
    if (round?.crystal != null) answer(round.crystal);
  },

  setTuning(tuning) {
    set({ tuning });
    station?.send({ type: "player:strategy", act: 3, tuning });
  },

  setPlan(plan) {
    set({ plan });
    station?.send({ type: "player:strategy", act: 2, classical: plan });
  },

  setReady(ready) {
    station?.send({ type: "player:ready", ready });
  },

  leave() {
    // Tell the room first: the seat stays ours and CORA covers it until we rejoin.
    station?.send({ type: "player:leave" });
    station?.close();
    station = null;
    session.remove(KEY);
    set({ status: "idle", seat: null, playerId: null, state: null, round: null, flash: null });
  },
}));
