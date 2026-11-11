import { describe, expect, it } from "vitest";
import { pickJoinOrigin, joinUrl } from "../src/net/joinOrigin.ts";
import { addressRank, joinInfo, normalizePublicUrl, rankAddresses } from "./joinInfo.ts";

const nic = (address: string, internal = false, family = "IPv4") =>
  ({ address, internal, family, netmask: "", mac: "", cidr: null }) as never;

describe("ranking the laptop's addresses (server)", () => {
  it("home and venue ranges first: 192.168, then 10, then 172.16–31, then anything else", () => {
    expect(addressRank("192.168.1.20", "en0")).toBe(1);
    expect(addressRank("10.0.0.5", "en0")).toBe(2);
    expect(addressRank("172.20.10.5", "en0")).toBe(3);
    expect(addressRank("172.32.0.1", "en0")).toBe(4); // outside 172.16.0.0/12
    expect(addressRank("203.0.113.9", "eth0")).toBe(4);
  });

  it("last: link-local, carrier-grade NAT (VPNs) and interfaces that look virtual", () => {
    expect(addressRank("169.254.10.2", "en5")).toBe(5);
    expect(addressRank("100.101.7.3", "en0")).toBe(5);
    for (const iface of ["docker0", "br-1a2b3c", "bridge100", "veth9f", "vmnet8", "vboxnet0", "utun3", "tun0", "tailscale0", "zt7nnig", "wg0"])
      expect(addressRank("192.168.64.1", iface)).toBe(5);
    expect(addressRank("100.63.255.1", "en0")).toBe(4); // just below 100.64.0.0/10
  });

  it("a laptop with Docker and a VPN: Wi-Fi wins, the virtual ones go last in interface order", () => {
    const ranked = rankAddresses({
      lo0: [nic("127.0.0.1", true)],
      docker0: [nic("172.17.0.1")],
      "br-5f2c": [nic("172.18.0.1")],
      utun3: [nic("10.8.0.2")],
      tailscale0: [nic("100.101.7.3")],
      en0: [nic("192.168.1.20"), nic("fe80::1", false, "IPv6")],
      en7: [nic("169.254.3.4")],
    });
    expect(ranked).toEqual([
      { address: "192.168.1.20", iface: "en0" },
      { address: "172.17.0.1", iface: "docker0" },
      { address: "172.18.0.1", iface: "br-5f2c" },
      { address: "10.8.0.2", iface: "utun3" },
      { address: "100.101.7.3", iface: "tailscale0" },
      { address: "169.254.3.4", iface: "en7" },
    ]);
  });

  it("joinInfo: ranked join URLs with their interfaces, no duplicates; PUBLIC_URL without a trailing slash", () => {
    const info = joinInfo({
      port: 8787,
      interfaces: { en1: [nic("10.0.0.5")], en0: [nic("192.168.1.20")], en2: [nic("192.168.1.20")] },
    });
    expect(info).toEqual({
      publicUrl: null,
      lan: [
        { url: "http://192.168.1.20:8787", iface: "en0" },
        { url: "http://10.0.0.5:8787", iface: "en1" },
      ],
    });
    expect(joinInfo({ publicUrl: "https://crew.example.org/", port: 1, interfaces: {} }).publicUrl).toBe("https://crew.example.org");
    expect(joinInfo({ publicUrl: "  ", port: 1, interfaces: {} }).publicUrl).toBeNull();
  });

  it("PUBLIC_URL without a scheme gets one, so the QR code opens as a link", () => {
    const cases: [string, string][] = [
      ["crew.example.org", "https://crew.example.org"],
      ["crew.example.org/", "https://crew.example.org"],
      ["quantum-crew.onrender.com", "https://quantum-crew.onrender.com"],
      ["192.168.1.20:8787", "http://192.168.1.20:8787"],
      ["192.168.1.20", "http://192.168.1.20"],
      ["crew-laptop.local:8787", "http://crew-laptop.local:8787"],
      ["crew-laptop.local", "http://crew-laptop.local"],
      ["localhost:8787", "http://localhost:8787"],
      ["crew.example.org:8443", "http://crew.example.org:8443"],
    ];
    for (const [raw, url] of cases) {
      expect(normalizePublicUrl(raw)).toEqual({ url, fixed: true });
      expect(joinInfo({ publicUrl: raw, port: 1, interfaces: {} }).publicUrl).toBe(url);
    }
    // Given a scheme, it's kept as written (only trailing slashes go).
    expect(normalizePublicUrl("http://crew.example.org/")).toEqual({ url: "http://crew.example.org", fixed: false });
    expect(normalizePublicUrl("HTTPS://crew.example.org")).toEqual({ url: "HTTPS://crew.example.org", fixed: false });
    expect(normalizePublicUrl(undefined)).toEqual({ url: null, fixed: false });
  });
});

describe("pickJoinOrigin (TV)", () => {
  const wifi = { url: "http://192.168.1.20:8787", iface: "en0" };
  const vpn = { url: "http://100.101.7.3:8787", iface: "utun4" };
  const lan = { publicUrl: null, lan: [wifi, vpn] };
  const local = { origin: "http://localhost:8787", hostname: "localhost" };

  it("PUBLIC_URL first, with no alternatives", () => {
    expect(pickJoinOrigin({ publicUrl: "https://crew.example.org", lan: [wifi] }, local)).toEqual({
      origin: "https://crew.example.org",
      warning: false,
      alternatives: [],
    });
  });
  it("the TV's own address when phones can reach it", () => {
    expect(pickJoinOrigin(lan, { origin: "http://192.168.1.20:8787", hostname: "192.168.1.20" })).toEqual({
      origin: "http://192.168.1.20:8787",
      warning: false,
      alternatives: [],
    });
    expect(pickJoinOrigin(null, { origin: "https://crew.example.org", hostname: "crew.example.org" }).origin).toBe("https://crew.example.org");
  });
  it("at localhost: the best-ranked address, the others offered as alternatives", () => {
    expect(pickJoinOrigin(lan, local)).toEqual({ origin: wifi.url, warning: false, alternatives: [vpn] });
    expect(pickJoinOrigin(lan, { origin: "http://127.0.0.1:8787", hostname: "127.0.0.1" }).origin).toBe(wifi.url);
  });
  it("the facilitator's choice wins while the server still has that address", () => {
    expect(pickJoinOrigin(lan, local, vpn.url)).toEqual({ origin: vpn.url, warning: false, alternatives: [wifi] });
    expect(pickJoinOrigin(lan, local, "http://10.9.9.9:8787").origin).toBe(wifi.url); // a stale choice
  });
  it("a warning when the TV is at localhost and nothing else is available", () => {
    expect(pickJoinOrigin({ publicUrl: null, lan: [] }, local)).toEqual({ origin: "http://localhost:8787", warning: true, alternatives: [] });
    expect(pickJoinOrigin(null, local).warning).toBe(true);
  });
  it("the link phones open", () => {
    expect(joinUrl("http://192.168.1.20:8787", "ABCD")).toBe("http://192.168.1.20:8787/play?room=ABCD");
  });
});
