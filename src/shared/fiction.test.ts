import { describe, expect, it } from "vitest";
import { isWin, scoreRound, type Bit } from "./chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT, isStableCause, roundCause } from "./fiction.ts";

const bits: Bit[] = [0, 1];

describe("fiction", () => {
  it("a cause is stable exactly when the CHSH rule wins, for all 16 rounds", () => {
    for (const x of bits) for (const y of bits) for (const a of bits) for (const b of bits) {
      expect(isStableCause(roundCause({ x, y, a, b }))).toBe(isWin(x, y, a, b));
    }
  });

  it("names the six cases", () => {
    const cw = CLOCKWISE;
    const acw = ANTICLOCKWISE;
    expect(roundCause({ x: COOL, y: COOL, a: cw, b: cw })).toBe("circulate");
    expect(roundCause({ x: COOL, y: COOL, a: cw, b: acw })).toBe("spike");
    expect(roundCause({ x: HOT, y: COOL, a: acw, b: acw })).toBe("carry");
    expect(roundCause({ x: COOL, y: HOT, a: acw, b: cw })).toBe("spike");
    expect(roundCause({ x: HOT, y: HOT, a: cw, b: cw })).toBe("overheat");
    expect(roundCause({ x: HOT, y: HOT, a: acw, b: cw })).toBe("purge");
  });

  it("a timeout is too slow, and never stable", () => {
    const r = scoreRound(HOT, HOT, null, CLOCKWISE);
    expect(roundCause(r)).toBe("slow");
    expect(isStableCause(roundCause(r))).toBe(r.win);
  });
});
