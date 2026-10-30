// The join address on the TV (its QR code and printed link are built from this one value).
// In order: the server's PUBLIC_URL; the TV's own address, if phones can reach it too (anything but localhost); the
// server's LAN address, when the TV is open on the laptop itself at localhost; otherwise nothing, and the TV warns.
import { STATION_INFO_PATH, type StationInfo } from "../shared/protocol.ts";

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type JoinOrigin = { origin: string; warning: false } | { origin: string; warning: true };

export function pickJoinOrigin(info: StationInfo | null, here: { origin: string; hostname: string }): JoinOrigin {
  if (info?.publicUrl) return { origin: info.publicUrl, warning: false };
  if (!LOCAL.has(here.hostname)) return { origin: here.origin, warning: false };
  const lan = info?.lanUrls[0];
  if (lan) return { origin: lan, warning: false };
  // Only this computer can open a localhost link: show it, with a warning.
  return { origin: here.origin, warning: true };
}

export const joinUrl = (origin: string, room: string) => `${origin}/play?room=${room}`;

/** Asks the server where phones should join (null if it can't say, e.g. an older server or no network). */
export async function fetchStationInfo(): Promise<StationInfo | null> {
  try {
    const r = await fetch(STATION_INFO_PATH, { cache: "no-store" });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
    return (await r.json()) as StationInfo;
  } catch {
    return null;
  }
}
