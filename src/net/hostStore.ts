// The TV's connection: creates (or resumes) a room and runs the session with host commands.
import { create } from "zustand";
import type { HostCommand, Pace, RoomState, RoundOutcome } from "../shared/protocol.ts";
import { toLocalDeadline } from "./useCountdown.ts";
import { connectStation, session, type SocketStatus, type Station } from "./socket.ts";

const KEY = "qc-host";

type HostStore = {
  status: SocketStatus;
  state: RoomState | null;
  /** The room's deadline on this device's clock. */
  localDeadline: number | null;
  results: { roundId: string; results: RoundOutcome[] } | null;
  error: string | null;
  start(): () => void;
  /** Sends a host command with the room's current step, so a stale press (a double tap) is ignored by the room. */
  command(cmd: HostCommand, pace?: Pace): void;
};

let station: Station | null = null;

export const useHost = create<HostStore>()((set) => ({
  status: "connecting",
  state: null,
  localDeadline: null,
  results: null,
  error: null,

  start() {
    station = connectStation({
      onStatus: (status) => set({ status }),
      hello: (send) => {
        const saved = session.get<{ room: string; token: string }>(KEY);
        send(saved ? { type: "host:resume", ...saved } : { type: "host:create" });
      },
      onMessage: (msg) => {
        switch (msg.type) {
          case "host:created":
            session.set(KEY, { room: msg.room, token: msg.token });
            return set({ error: null });
          case "room:state":
            return set({ state: msg.state, localDeadline: toLocalDeadline(msg.state.deadline, msg.state.serverNow) });
          case "round:results":
            return set({ results: { roundId: msg.roundId, results: msg.results } });
          case "error":
            // A stale saved room (server restarted): start a fresh one.
            if (msg.code === "no-room" || msg.code === "not-host") {
              session.remove(KEY);
              station?.send({ type: "host:create" });
              return;
            }
            if (msg.code === "stale") return; // a double press: the room already moved on
            return set({ error: msg.message });
        }
      },
    });
    return () => {
      station?.close();
      station = null;
    };
  },

  command(cmd, pace) {
    set({ error: null });
    const step = useHost.getState().state?.step;
    station?.send({ type: "host:command", cmd, ...(step && { step }), ...(pace && { pace }) });
  },
}));
