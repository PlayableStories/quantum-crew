import { describe, expect, it } from "vitest";
import { MAX_PAIRS } from "../config.ts";
import { casesClass, casesView, pairDensity, pairsClass } from "./tvDensity.ts";

describe("the TV's layout by pair count", () => {
  it("pair cards: roomy, crowded from 3, dense from 5", () => {
    expect([1, 2, 3, 4, 5, 6].map(pairDensity)).toEqual(["roomy", "roomy", "crowded", "crowded", "dense", "dense"]);
    expect(pairsClass(2)).toBe("");
    expect(pairsClass(4)).toBe("pairs--crowded");
    expect(pairsClass(MAX_PAIRS)).toBe("pairs--crowded pairs--dense");
  });

  it("wave done: full grids up to 4 pairs, compact rows from 5", () => {
    expect([1, 2, 3, 4].map(casesView)).toEqual(["full", "full", "full", "full"]);
    expect([5, 6].map(casesView)).toEqual(["compact", "compact"]);
    expect(casesClass(0)).toBe("tv__cases--1");
    expect(casesClass(3)).toBe("tv__cases--3");
    expect(casesClass(MAX_PAIRS)).toBe("tv__cases--compact");
  });

  it("every pair count up to MAX_PAIRS has a layout", () => {
    for (let n = 1; n <= MAX_PAIRS; n++) expect(casesClass(n)).toMatch(/^tv__cases--(\d|compact)$/);
  });
});
