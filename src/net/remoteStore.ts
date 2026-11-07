// The facilitator's phone remote (`/host`): pairs with a room using the remote key from the TV's QR code, then sends
// the same host commands as the TV. The room and key come from the URL once, are kept in sessionStorage (so a reload
// or a screen lock re-pairs) and are taken out of the address bar.
import { create } from "zustand";
import type { HostCommand, RoomState, Speed, RoundOutcome } from "../shared/protocol.ts";
import { toLocalDeadline } from "./useCountdown.ts";
import { connectStation, session, type SocketStatus, type Station } from "./socket.ts";

const KEY = "qc-remote";

type Link = { room: string; key: string };

/** `paired` once the room accepted the key; `expired` when it didn't (unpaired, or the server restarted); `noLink`
 *  when the page was opened without one. */
export type RemoteLink = "pairing" | "paired" | "expired" | "noLink";

type RemoteStore = {
  status: SocketStatus;
  link: RemoteLink;
  state: RoomState | null;
  /** The room's deadline on this device's clock. */
  localDeadline: number | null;
  results: { roundId: string; results: RoundOutcome[] } | null;
  error: string | null;
  start(): () => void;
  /** Sends a host command with the room's current step: if the TV (or another remote) moved first, the room ignores it. */
  command(cmd: HostCommand, speed?: Speed): void;
};

let station: Station | null = null;

/** The link in the URL (saved, then removed from the address bar), else the saved one. */
function readLink(): Link | null {
  const q = new URLSearchParams(location.search);
  const room = q.get("room");
  const key = q.get("key");
  if (room && key) {
    const link = { room: room.toUpperCase(), key };
    session.set(KEY, link);
    // Keep the key out of the address bar (a screenshot, a shared tab).
    history.replaceState(null, "", location.pathname);
    return link;
  }
  return session.get<Link>(KEY);
}

export const useRemote = create<RemoteStore>()((set) => ({
  status: "connecting",
  link: "pairing",
  state: null,
  localDeadline: null,
  results: null,
  error: null,

  start() {
    const link = readLink();
    if (!link) {
      set({ link: "noLink" });
      return () => {};
    }
    set({ link: "pairing" });
    station = connectStation({
      onStatus: (status) => set({ status }),
      hello: (send) => send({ type: "remote:pair", ...link }),
      onMessage: (msg) => {
        switch (msg.type) {
          case "remote:paired":
            return set({ link: "paired", error: null });
          case "room:state":
            return set({ state: msg.state, localDeadline: toLocalDeadline(msg.state.deadline, msg.state.serverNow) });
          case "round:results":
            return set({ results: { roundId: msg.roundId, results: msg.results } });
          case "error":
            // The key no longer works (the TV unpaired remotes, or the room is gone): scan the TV again.
            if (msg.code === "no-room" || msg.code === "not-host") {
              session.remove(KEY);
              station?.close();
              station = null;
              return set({ link: "expired", state: null });
            }
            if (msg.code === "stale") return; // the TV or another remote moved first
            return set({ error: msg.message });
        }
      },
    });
    return () => {
      station?.close();
      station = null;
    };
  },

  command(cmd, speed) {
    set({ error: null });
    const step = useRemote.getState().state?.step;
    station?.send({ type: "host:command", cmd, ...(step && { step }), ...(speed && { speed }) });
  },
}));
