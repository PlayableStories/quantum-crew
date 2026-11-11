// Where phones should go to join: the server tells the TV (GET STATION_INFO_PATH), because the TV page alone can't
// know. PUBLIC_URL (env) wins when set; otherwise the server lists its own LAN IPv4 addresses on its port, best first.
// Laptops often have several (Wi-Fi plus Docker, a VPN, virtual machines), and only some are reachable from a phone,
// so the addresses are ranked: typical home and venue ranges first, virtual and VPN-looking ones last.
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import type { JoinAddress, StationInfo } from "../src/shared/protocol.ts";

type Interfaces = Record<string, NetworkInterfaceInfo[] | undefined>;

/** Interface names that are usually virtual: containers, VM bridges, VPN tunnels. */
const VIRTUAL = /^(docker|br-|bridge|veth|vmnet|vboxnet|utun|tun|tailscale|zt|wg)/i;

/** Lower is better: 192.168/16, 10/8, 172.16/12, anything else; last link-local, CGNAT/VPN and virtual interfaces. */
export function addressRank(address: string, iface: string): number {
  const [a = 0, b = 0] = address.split(".").map(Number);
  if (VIRTUAL.test(iface)) return 5;
  if (a === 169 && b === 254) return 5; // link-local: no DHCP answer, unreachable
  if (a === 100 && b >= 64 && b <= 127) return 5; // carrier-grade NAT, used by VPNs such as Tailscale
  if (a === 192 && b === 168) return 1;
  if (a === 10) return 2;
  if (a === 172 && b >= 16 && b <= 31) return 3;
  return 4;
}

/** Pure: the machine's non-internal IPv4 addresses, best first (interface order within a rank). */
export function rankAddresses(interfaces: Interfaces): { address: string; iface: string }[] {
  const all = Object.entries(interfaces).flatMap(([iface, list]) =>
    (list ?? []).filter((i) => i.family === "IPv4" && !i.internal).map((i) => ({ address: i.address, iface })),
  );
  const seen = new Set<string>();
  return all
    .map((a, order) => ({ ...a, order, rank: addressRank(a.address, a.iface) }))
    .sort((p, q) => p.rank - q.rank || p.order - q.order)
    .filter((a) => !seen.has(a.address) && !!seen.add(a.address))
    .map(({ address, iface }) => ({ address, iface }));
}

/**
 * Pure: PUBLIC_URL as the QR code needs it. A QR code without `http://` or `https://` reads as plain text on many
 * phones (no tap-to-open), so a missing scheme is added: `http://` for an address on the local network (an IPv4
 * address, `localhost`, a `.local` name, or anything with a port: no TLS there), else `https://` (a hosted site).
 * `fixed` says a scheme was added, so the server can warn. Trailing slashes go; blank is null.
 */
export function normalizePublicUrl(raw: string | undefined): { url: string | null; fixed: boolean } {
  const url = raw?.trim().replace(/\/+$/, "") ?? "";
  if (!url) return { url: null, fixed: false };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return { url, fixed: false };
  const host = url.split("/")[0]!;
  const local =
    /:\d+$/.test(host) || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^localhost$/i.test(host) || /\.local$/i.test(host);
  return { url: `${local ? "http" : "https"}://${url}`, fixed: true };
}

/** Pure: the join addresses for a server on `port`, given PUBLIC_URL and the machine's network interfaces. */
export function joinInfo({ publicUrl, port, interfaces }: { publicUrl?: string; port: number; interfaces: Interfaces }): StationInfo {
  const lan: JoinAddress[] = rankAddresses(interfaces).map(({ address, iface }) => ({ url: `http://${address}:${port}`, iface }));
  return { publicUrl: normalizePublicUrl(publicUrl).url, lan };
}

/** The live answer for this process. */
export const stationInfo = (port: number): StationInfo =>
  joinInfo({ publicUrl: process.env.PUBLIC_URL, port, interfaces: networkInterfaces() });
