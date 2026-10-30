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
});
