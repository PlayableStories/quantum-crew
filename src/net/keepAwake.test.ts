import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEEP_AWAKE_MS } from "../config.ts";
import { startKeepAwake } from "./keepAwake.ts";

describe("the TV's keep-awake heartbeat", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("requests every interval, never before, and stops", () => {
    const ping = vi.fn(() => Promise.resolve());
    const stop = startKeepAwake(30_000, ping);
    vi.advanceTimersByTime(29_999);
    expect(ping).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ping).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(ping).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(120_000);
    expect(ping).toHaveBeenCalledTimes(3);
  });

  it("a failed request is ignored", async () => {
    const ping = vi.fn(() => Promise.reject(new Error("offline")));
    const stop = startKeepAwake(30_000, ping);
    vi.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(ping).toHaveBeenCalledTimes(1);
    stop();
  });

  it("the default interval sits well inside a 50 s idle limit", () => {
    expect(KEEP_AWAKE_MS).toBeLessThan(50_000);
  });
});
