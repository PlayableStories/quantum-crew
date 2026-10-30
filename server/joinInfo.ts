// Where phones should go to join: the server tells the TV (GET STATION_INFO_PATH), because the TV page alone can't
// know. PUBLIC_URL (env) wins when set; otherwise the server lists its own LAN IPv4 addresses on its port.
import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import type { StationInfo } from "../src/shared/protocol.ts";

type Interfaces = Record<string, NetworkInterfaceInfo[] | undefined>;

/** Pure: the join addresses for a server on `port`, given PUBLIC_URL and the machine's network interfaces. */
export function joinInfo({ publicUrl, port, interfaces }: { publicUrl?: string; port: number; interfaces: Interfaces }): StationInfo {
  const lanUrls = Object.values(interfaces)
    .flat()
    .filter((i): i is NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i.address}:${port}`);
  const pub = publicUrl?.trim().replace(/\/+$/, "");
  return { publicUrl: pub || null, lanUrls: [...new Set(lanUrls)] };
}

/** The live answer for this process. */
export const stationInfo = (port: number): StationInfo =>
  joinInfo({ publicUrl: process.env.PUBLIC_URL, port, interfaces: networkInterfaces() });
