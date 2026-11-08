// What the facilitator can do now, shared by the TV's host row and the phone remote (`/host`): the steps that apply,
// the natural next one (Space / → on the TV, the big button on the remote), each step's label and whether it's
// allowed yet, and Play / Pause with the speed menu.
import { useEffect, useRef, useState } from "react";
import { useRemainingMs } from "../net/useCountdown.ts";
import { decisionMs, resultMs, secs } from "../shared/pace.ts";
import { CLUE_COUNT, pairsNotYet } from "../shared/crystalPlan.ts";
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import { SPEEDS, type HostCommand, type RoomState, type Speed } from "../shared/protocol.ts";
import { S } from "../strings.ts";

/** What the facilitator can do now, in the order they'd usually do it (the TV's row shows only these, plus Play /
 *  Pause, the speed and Reset). */
export function nextSteps(state: RoomState): HostCommand[] {
  switch (state.phase) {
    case "lobby":
      return ["startNightShift", "startStrategy", "startBatch"];
    case "briefing":
      return ["startBatch"];
    case "round":
    case "roundResult":
      return ["next"];
    case "storm":
      return ["startStrategy", "startBatch"];
    case "strategy":
      return state.act === 3 ? ["startBatch", "nextClue"] : ["startBatch"];
    // The tool reveal: no clue to release (clue 1 opens with the lull).
    case "batchDone":
      return state.act === 3
        ? ["startStrategy", "startBatch", "nextClue", "stormPasses"]
        : ["startStrategy", "startBatch", "revealCeiling", "unlockTool"];
    case "ceiling":
      return ["unlockTool"];
    case "tool":
      return ["startStrategy", "startBatch"];
    case "resolution":
      return ["debrief"];
    case "debrief":
      return [];
  }
}

/** The natural next step for Space / →: Next in a round or on a result (in either mode); start the wave from the
 *  lull; the report's Next. */
export function keyStep(state: RoomState): HostCommand | null {
  if (state.phase === "round" || state.phase === "roundResult") return "next";
  if (state.phase === "strategy") return "startBatch";
  if (state.phase === "debrief") return "reportNext";
  return null;
}

/** `nextSteps` without the ones that can't run yet (no players, the ceiling not revealed…). */
export function enabledSteps(state: RoomState): HostCommand[] {
  const hasPlayers = state.players.length > 0;
  const enabled: Partial<Record<HostCommand, boolean>> = {
    startNightShift: hasPlayers,
    startStrategy: hasPlayers,
    startBatch: hasPlayers,
    revealCeiling: state.stability.act2.rounds > 0,
    // DECISION: the tool unlocks after the ceiling has been revealed, to keep the learning arc in order.
    unlockTool: state.ceilingRevealed && !state.toolUnlocked,
    // The ending: after at least one Act III wave.
    stormPasses: state.stability.act3.rounds > 0,
    debrief: true,
    next: true,
    // Clue 2, the answer: after clue 1 and at least one Act III wave (the facilitator decides when).
    nextClue: state.toolUnlocked && state.clue === 1 && state.clue < CLUE_COUNT && state.stability.act3.rounds > 0,
  };
  return nextSteps(state).filter((cmd) => enabled[cmd]);
}

/** A step's button label: Start the rounds in the briefing, Close the round / Next round for Next. */
export function stepLabel(state: RoomState, cmd: HostCommand): string {
  if (cmd === "startBatch" && state.phase === "briefing") return S.tv.startRounds;
  if (cmd === "next") return state.phase === "round" ? S.tv.closeRound : S.tv.nextRound;
  if (cmd === "nextClue") return S.tv.nextClue(pairsNotYet(state.pairs), `${Math.round(SURVIVAL_THRESHOLD * 100)}%`);
  return S.tv.cmd[cmd];
}

/** Play / Pause (auto / manual, at once) with the seconds left while auto counts down, and a small ▾ beside it that
 *  opens the speeds (each with its times; picking one also plays). Closed by default. */
export function AutoToggle({
  state,
  localDeadline,
  onToggle,
  onSpeed,
}: {
  state: RoomState;
  localDeadline: number | null;
  onToggle: () => void;
  onSpeed: (speed: Speed) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const left = useRemainingMs(inBatch && state.auto ? localDeadline : null);
  // Escape or a click elsewhere closes the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  const act = state.act;
  return (
    <div className="tv__auto" ref={wrap}>
      <button
        type="button"
        className={`btn tv__auto-toggle ${state.auto ? "" : "btn--selected"}`}
        aria-label={state.auto ? S.tv.auto.pauseLabel : S.tv.auto.playLabel}
        title={state.auto ? S.tv.auto.pauseLabel : S.tv.auto.playLabel}
        onClick={onToggle}
      >
        {!state.auto ? S.tv.auto.play : left !== null ? S.tv.auto.counting(Math.ceil(left / 1000)) : S.tv.auto.pause}
      </button>
      <button
        type="button"
        className="btn tv__auto-more"
        aria-label={S.tv.auto.menu}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ▾
      </button>
      {open && (
        <div className="tv__auto-menu" role="radiogroup" aria-label={S.tv.auto.menu}>
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              type="button"
              role="radio"
              aria-checked={state.speed === sp}
              className={`tv__auto-speed ${state.speed === sp ? "tv__auto-speed--on" : ""}`}
              onClick={() => {
                onSpeed(sp);
                setOpen(false);
              }}
            >
              <strong>{S.tv.auto.speeds[sp]}</strong>
              <span className="muted small">{S.tv.auto.summary(secs(decisionMs(sp, act)), secs(resultMs(sp, act)))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
