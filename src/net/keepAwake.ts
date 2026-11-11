// The TV keeps its host awake: some hosts (Render's free tier) put the service to sleep when no request comes in for
// a while, and a sleeping service loses every room. While /screen is open it requests /healthz every KEEP_AWAKE_MS.
// The server's own WebSocket pings go the other way, so they may not count as inbound traffic. Only the TV does it:
// the service then stays awake only while a session is set up, never overnight.
import { KEEP_AWAKE_MS } from "../config.ts";

const defaultPing = () => fetch("/healthz", { cache: "no-store" });

/** Starts the heartbeat; returns stop. A failed beat is ignored (the socket's reconnect handles a real outage). */
export function startKeepAwake(ms: number = KEEP_AWAKE_MS, ping: () => Promise<unknown> = defaultPing): () => void {
  const timer = setInterval(() => {
    ping().catch(() => {});
  }, ms);
  return () => clearInterval(timer);
}
