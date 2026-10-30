import { describe, expect, it } from "vitest";
import { pickJoinOrigin, joinUrl } from "../src/net/joinOrigin.ts";
import { joinInfo } from "./joinInfo.ts";

const nic = (address: string, internal = false, family = "IPv4") =>
  ({ address, internal, family, netmask: "", mac: "", cidr: null }) as never;

describe("joinInfo (server)", () => {
  it("lists non-internal IPv4 addresses on the server's port", () => {
    const info = joinInfo({
      port: 8787,
      interfaces: { lo0: [nic("127.0.0.1", true)], en0: [nic("192.168.1.20"), nic("fe80::1", false, "IPv6")], en1: [nic("10.0.0.5")] },
    });
    expect(info).toEqual({ publicUrl: null, lanUrls: ["http://192.168.1.20:8787", "http://10.0.0.5:8787"] });
  });

  it("uses PUBLIC_URL when set (without a trailing slash)", () => {
    expect(joinInfo({ publicUrl: "https://crew.example.org/", port: 1, interfaces: {} }).publicUrl).toBe("https://crew.example.org");
    expect(joinInfo({ publicUrl: "  ", port: 1, interfaces: {} }).publicUrl).toBeNull();
  });
});

describe("pickJoinOrigin (TV)", () => {
  const lan = { publicUrl: null, lanUrls: ["http://192.168.1.20:8787"] };
  const local = { origin: "http://localhost:8787", hostname: "localhost" };

  it("PUBLIC_URL first", () => {
    expect(pickJoinOrigin({ publicUrl: "https://crew.example.org", lanUrls: [] }, local)).toEqual({ origin: "https://crew.example.org", warning: false });
  });
  it("the TV's own address when phones can reach it", () => {
    expect(pickJoinOrigin(lan, { origin: "http://192.168.1.20:8787", hostname: "192.168.1.20" }).origin).toBe("http://192.168.1.20:8787");
    expect(pickJoinOrigin(null, { origin: "https://crew.fly.dev", hostname: "crew.fly.dev" })).toEqual({ origin: "https://crew.fly.dev", warning: false });
  });
  it("the LAN address when the TV is at localhost", () => {
    expect(pickJoinOrigin(lan, local)).toEqual({ origin: "http://192.168.1.20:8787", warning: false });
    expect(pickJoinOrigin(lan, { origin: "http://127.0.0.1:8787", hostname: "127.0.0.1" }).origin).toBe("http://192.168.1.20:8787");
  });
  it("a warning when the TV is at localhost and nothing else is available", () => {
    expect(pickJoinOrigin({ publicUrl: null, lanUrls: [] }, local)).toEqual({ origin: "http://localhost:8787", warning: true });
    expect(pickJoinOrigin(null, local).warning).toBe(true);
  });
  it("the link phones open", () => {
    expect(joinUrl("http://192.168.1.20:8787", "ABCD")).toBe("http://192.168.1.20:8787/play?room=ABCD");
  });
});

