// How the TV lays out its pairs at each room size (up to MAX_PAIRS). Pure, so the thresholds are tested in one place.
//   pair cards: 1–2 roomy (one per row), 3–4 crowded (two to a row), 5–6 dense (two to a row, three rows, tighter);
//   wave done: each pair's full four-case grid up to 4 pairs; from 5 a compact row per pair (true rate and the case
//   that lets it down), and each phone shows its own pair's four cases.

export type PairDensity = "roomy" | "crowded" | "dense";
export type CasesView = "full" | "compact";

export const CROWDED_FROM = 3;
export const DENSE_FROM = 5;

export function pairDensity(pairs: number): PairDensity {
  return pairs >= DENSE_FROM ? "dense" : pairs >= CROWDED_FROM ? "crowded" : "roomy";
}

export function casesView(pairs: number): CasesView {
  return pairs >= DENSE_FROM ? "compact" : "full";
}

/** The pair list's classes: `pairs--crowded` from 3 pairs, plus `pairs--dense` from 5. */
export function pairsClass(pairs: number): string {
  const d = pairDensity(pairs);
  return d === "dense" ? "pairs--crowded pairs--dense" : d === "crowded" ? "pairs--crowded" : "";
}

/** Wave done's grid class: the column count for full grids (1–4), or the compact rows. */
export function casesClass(pairs: number): string {
  return casesView(pairs) === "compact" ? "tv__cases--compact" : `tv__cases--${Math.max(1, pairs)}`;
}
