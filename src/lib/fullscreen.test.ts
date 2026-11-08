import { describe, expect, it, vi } from "vitest";
import { toggleFullscreen } from "./fullscreen.ts";

describe("toggleFullscreen (TV key F)", () => {
  it("enters full screen on the whole page when it's off", () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    const exitFullscreen = vi.fn(() => Promise.resolve());
    toggleFullscreen({ fullscreenElement: null, exitFullscreen, documentElement: { requestFullscreen } });
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("leaves it when it's on", () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    const exitFullscreen = vi.fn(() => Promise.resolve());
    toggleFullscreen({ fullscreenElement: {} as Element, exitFullscreen, documentElement: { requestFullscreen } });
    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("uses Safari's prefixed calls, and never throws when refused", () => {
    const webkitRequestFullscreen = vi.fn();
    toggleFullscreen({ documentElement: { webkitRequestFullscreen } });
    expect(webkitRequestFullscreen).toHaveBeenCalledOnce();
    const refused = () => Promise.reject(new Error("not allowed"));
    expect(() => toggleFullscreen({ documentElement: { requestFullscreen: refused } })).not.toThrow();
    expect(() => toggleFullscreen({ documentElement: {} })).not.toThrow();
  });
});
