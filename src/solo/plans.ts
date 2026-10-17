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

/** A tested cell: its 1,000-round win rate and who ran it. */
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

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Keyboard movement on the board: the cell an arrow key moves to (rows = your plan), or null at an edge or for
 *  any other key. */
export function moveCell(k: CellKey, key: string): CellKey | null {
  const step = ARROWS[key];
  if (!step) return null;
  const [p, c] = k.split("-").map(Number) as [number, number];
  const np = p + step[0];
  const nc = c + step[1];
  if (np < 0 || np > 3 || nc < 0 || nc > 3) return null;
  return `${np}-${nc}` as CellKey;
}
