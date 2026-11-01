// Event-mode test fixtures (no browser): a room state with one pair (Ada at Table A with Bo, or with CORA), and the
// phone store set up so server rendering shows it.
import { usePlayer } from "../net/playerStore.ts";
import type { Act, RoomPhase, RoomState } from "../shared/protocol.ts";
import { S } from "../strings.ts";

export const rate = { rounds: 0, wins: 0, timeouts: 0 };
export const always = { onGreen: 0, onRed: 0 } as const;

/** Ada at Table A, paired with Bo (or CORA when `bot`). */
export function room(phase: RoomPhase, bot = false, act: Act = 1): RoomState {
  return {
    room: "ABCD",
    phase,
    act,
    batchNo: 0,
    roundNo: 1,
    batchSize: 12,
    deadline: null,
    serverNow: 0,
    players: [
      { id: "ada", name: "Ada", table: "A", connected: true, pairId: 1 },
      ...(bot ? [] : [{ id: "bo", name: "Bo", table: "B" as const, connected: true, pairId: 1 }]),
    ],
    pairs: [
      {
        id: 1,
        a: { playerId: "ada", name: "Ada" },
        b: bot ? { playerId: null, name: S.crew.name } : { playerId: "bo", name: "Bo" },
        act1: rate,
        act2: rate,
        act3: rate,
        answered: { a: false, b: false },
        plans: { a: always, b: always },
        locked: null,
        lastWave: null,
      },
    ],
    stability: { rolling: null, act1: rate, act2: rate, act3: rate },
    lastBatch: null,
    triedPlans: [],
    ceilingRevealed: false,
    toolUnlocked: false,
    marginals: null,
  };
}


type PlayerState = ReturnType<typeof usePlayer.getState>;
/** Server rendering reads the store's initial state, so the test writes there (and to the live state). */
export function put(patch: Partial<PlayerState>) {
  Object.assign(usePlayer.getInitialState(), patch);
  usePlayer.setState(patch);
}

export function seat(state: RoomState) {
  put({ seat: { room: "ABCD", name: "Ada", table: "A" }, playerId: "ada", status: "open", state });
}
