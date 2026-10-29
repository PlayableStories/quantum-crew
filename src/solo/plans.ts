// The four Act II plans by name, and the 4×4 plan board (your plan × the crewmate's plan). Pure; no React.
// The plans are chsh.ts's CLASSICAL_STRATEGIES in the same order, so a board cell is just a pair of indices.
import { CLASSICAL_STRATEGIES, classicalExpectedWinRate, type ClassicalStrategy } from "../shared/chsh.ts";

/** Index into CLASSICAL_STRATEGIES: 0 always clockwise, 1 reverse when HOT, 2 reverse when COOL, 3 always anticlockwise. */
export type PlanId = 0 | 1 | 2 | 3;

export const PLAN_IDS: readonly PlanId[] = [0, 1, 2, 3];

export const planOf = (id: PlanId): ClassicalStrategy => CLASSICAL_STRATEGIES[id]!;

export function planId(p: ClassicalStrategy): PlanId {
  const i = CLASSICAL_STRATEGIES.findIndex((s) => s.onGreen === p.onGreen && s.onRed === p.onRed);
  return i as PlanId;
}

/** A board cell: "<your plan>-<crewmate's plan>". */
export type CellKey = `${PlanId}-${PlanId}`;

export const cellKey = (player: ClassicalStrategy, crew: ClassicalStrategy): CellKey => `${planId(player)}-${planId(crew)}`;

export const ALL_CELLS: readonly CellKey[] = PLAN_IDS.flatMap((p) => PLAN_IDS.map((c) => `${p}-${c}` as CellKey));

/** A board square: its exact rate, and whether the player tried the pair (locked in and played) or engineering ran it. */
export type BoardCell = { rate: number; by: "player" | "engineering" };

export type Board = Partial<Record<CellKey, BoardCell>>;

/** The exact rate of every cell (no sampling). Every cell is 75% or 25%; none beats 75%. */
export function expectedBoard(): Record<CellKey, number> {
  return Object.fromEntries(
    ALL_CELLS.map((k) => {
      const [p, c] = k.split("-").map(Number) as [PlanId, PlanId];
      return [k, classicalExpectedWinRate(planOf(p), planOf(c))];
    }),
  ) as Record<CellKey, number>;
}
