// The TV's join panel: the QR code and the printed link come from one URL; the localhost warning shows only when asked.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { S } from "../strings.ts";
import { JoinPanel } from "./Screen.tsx";

describe("the TV's join panel", () => {
  it("the printed link is the QR's link; the warning shows only when asked", () => {
    const url = "http://192.168.1.20:8787/play?room=ABCD";
    const html = renderToString(<JoinPanel url={url} code="ABCD" big />);
    expect(html).toContain(`data-join-url="${url}"`);
    expect(html).toContain(S.tv.joinAt("192.168.1.20:8787/play?room=ABCD"));
    expect(html).not.toContain("tv__join-warning");
    const warned = renderToString(<JoinPanel url={url} code="ABCD" big warning />);
    expect(warned).toContain("tv__join-warning");
  });

  it("in the lobby, the laptop's other addresses are offered as buttons; elsewhere they aren't", () => {
    const url = "http://192.168.1.20:8787/play?room=ABCD";
    const alternatives = [{ url: "http://100.101.7.3:8787", iface: "utun4" }];
    const html = renderToString(<JoinPanel url={url} code="ABCD" big alternatives={alternatives} />);
    expect(html).toContain(S.tv.tryOther);
    expect(html).toContain(`aria-label="${S.tv.useAddress("100.101.7.3:8787", "utun4")}"`);
    expect(html).toContain(`data-join-url="${url}"`); // the QR code and the link still share one URL
    expect(renderToString(<JoinPanel url={url} code="ABCD" big={false} alternatives={alternatives} />)).not.toContain(S.tv.tryOther);
  });
});
