import { describe, expect, it } from "vitest";
import { keyAction, keyTarget } from "./keys.ts";

const free = { typing: false, onControl: false };
const onButton = { typing: false, onControl: true };
const typing = { typing: true, onControl: false };

describe("keyAction (K1: the shortcuts shared by solo and the TV)", () => {
  it("D, F, M and ? in both modes, also with a button focused; never while typing or with a modifier", () => {
    for (const mode of ["solo", "tv"] as const) {
      expect(keyAction({ key: "d" }, mode, free)).toBe("debug");
      expect(keyAction({ key: "F" }, mode, onButton)).toBe("fullscreen");
      expect(keyAction({ key: "m" }, mode, free)).toBe("mute");
      expect(keyAction({ key: "?" }, mode, onButton)).toBe("help");
      expect(keyAction({ key: "d" }, mode, typing)).toBeNull();
      expect(keyAction({ key: "f", metaKey: true }, mode, free)).toBeNull();
      expect(keyAction({ key: "m", repeat: true }, mode, free)).toBeNull();
    }
  });

  it("solo: Space / Enter press the main button, outside a wave and not on a focused control", () => {
    expect(keyAction({ key: " " }, "solo", free)).toBe("primary");
    expect(keyAction({ key: "Enter" }, "solo", free)).toBe("primary");
    expect(keyAction({ key: "Enter" }, "solo", free, true)).toBeNull(); // rounds keep their own keys
    expect(keyAction({ key: " " }, "solo", onButton)).toBeNull(); // the focused button presses itself
    expect(keyAction({ key: "p" }, "solo", free)).toBeNull(); // no pacing in solo
  });

  it("TV: Space / → = next, P = play / pause; Enter stays for focused buttons", () => {
    expect(keyAction({ key: " " }, "tv", free)).toBe("next");
    expect(keyAction({ key: "ArrowRight" }, "tv", free)).toBe("next");
    expect(keyAction({ key: "P" }, "tv", free)).toBe("playPause");
    expect(keyAction({ key: "Enter" }, "tv", free)).toBeNull();
    expect(keyAction({ key: " " }, "tv", onButton)).toBeNull();
  });

  it("TV: J opens the join QR (also with a button focused); solo has no J", () => {
    expect(keyAction({ key: "j" }, "tv", free)).toBe("join");
    expect(keyAction({ key: "J" }, "tv", onButton)).toBe("join");
    expect(keyAction({ key: "j" }, "tv", typing)).toBeNull();
    expect(keyAction({ key: "j" }, "solo", free)).toBeNull();
  });

  it("keyTarget reads fields, sheets and controls", () => {
    const at = (match: string) => ({ closest: (sel: string) => (sel.split(", ").includes(match) ? {} : null) });
    expect(keyTarget(at("input") as unknown as EventTarget)).toEqual({ typing: true, onControl: false });
    expect(keyTarget(at("dialog") as unknown as EventTarget)).toEqual({ typing: true, onControl: false });
    expect(keyTarget(at("button") as unknown as EventTarget)).toEqual({ typing: false, onControl: true });
    expect(keyTarget(null)).toEqual({ typing: false, onControl: false });
  });
});
