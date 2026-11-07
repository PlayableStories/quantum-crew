// The join address on the TV (its QR code and printed link are built from this one value).
// In order: the server's PUBLIC_URL; the TV's own address, if phones can reach it too (anything but localhost); the
// server's LAN address, when the TV is open on the laptop itself at localhost (the facilitator's choice if they made
// one, else the best-ranked); otherwise nothing, and the TV warns. At localhost with several LAN addresses, the others
// come back as `alternatives` so the facilitator can switch with one click.
import { STATION_INFO_PATH, type JoinAddress, type StationInfo } from "../shared/protocol.ts";

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type JoinOrigin = { origin: string; warning: boolean; alternatives: JoinAddress[] };

export function pickJoinOrigin(
  info: StationInfo | null,
  here: { origin: string; hostname: string },
  chosen?: string | null,
): JoinOrigin {
  if (info?.publicUrl) return { origin: info.publicUrl, warning: false, alternatives: [] };
  if (!LOCAL.has(here.hostname)) return { origin: here.origin, warning: false, alternatives: [] };
  const lan = info?.lan ?? [];
  const pick = lan.find((a) => a.url === chosen) ?? lan[0];
  if (pick) return { origin: pick.url, warning: false, alternatives: lan.filter((a) => a !== pick) };
  // Only this computer can open a localhost link: show it, with a warning.
  return { origin: here.origin, warning: true, alternatives: [] };
}

/** The facilitator's choice of LAN address, kept on this TV across reloads (null if storage is unavailable). */
const CHOSEN_KEY = "qc-join-address";
export function loadChosenAddress(): string | null {
  try {
    return localStorage.getItem(CHOSEN_KEY);
  } catch {
    return null;
  }
}
export function saveChosenAddress(url: string) {
  try {
    localStorage.setItem(CHOSEN_KEY, url);
  } catch {
    // The choice still applies until the page reloads.
  }
}

export const joinUrl = (origin: string, room: string) => `${origin}/play?room=${room}`;

/** The facilitator's phone remote: same origin as the join link, plus the room's remote key (only the TV has it). */
export const remoteUrl = (origin: string, room: string, key: string) =>
  `${origin}/host?room=${room}&key=${encodeURIComponent(key)}`;

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
