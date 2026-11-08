// The facilitator's phone remote (`/host`, opened from the TV's Remote QR code): the step that applies now as one big
// button, the other steps, Play / Pause with the speed, what to say, and the room (who is still choosing, each pair's
// cause). It never shows sensors or pumps, only what the TV already shows. Commands carry the room's step, so the TV
// and the remote pressing at once move on once.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "../components/Sheet.tsx";
import { useRemote } from "../net/remoteStore.ts";
import { useElapsedMs } from "../net/useCountdown.ts";
import { REPORT_STEPS, roundIdOf, type HostCommand, type RoomState, type RoundOutcome, type Speed } from "../shared/protocol.ts";
import { SURVIVAL_THRESHOLD } from "../shared/chsh.ts";
import { CLUE_SETTINGS, RULE_GAPS, clueAnswer } from "../shared/crystalPlan.ts";
import { formatDeg } from "../components/Dial.tsx";
import { rateText } from "../components/CrystalPlan.tsx";
import { S, type ClueTalk } from "../strings.ts";
import { AutoToggle, enabledSteps, keyStep, stepLabel } from "./hostSteps.tsx";

export function Remote() {
  const { status, link, state, localDeadline, results, error, start, command } = useRemote();
  useEffect(() => start(), [start]);

  if (link === "expired" || link === "noLink") {
    return (
      <main className="remote remote--center">
        <h1>{link === "expired" ? S.remote.expired : S.remote.noLink}</h1>
        <p className="muted">{link === "expired" ? S.remote.expiredBody : S.remote.noLinkBody}</p>
      </main>
    );
  }
  if (!state) {
    return (
      <main className="remote remote--center">
        <p className="muted">{status === "closed" ? S.event.reconnecting : S.remote.pairing}</p>
      </main>
    );
  }
  const last =
    state.phase === "roundResult" && results?.roundId === roundIdOf(state.act, state.batchNo, state.roundNo)
      ? results.results
      : null;
  return (
    <RemotePanel
      state={state}
      localDeadline={localDeadline}
      lastResults={last}
      offline={status !== "open"}
      error={error}
      onCommand={command}
    />
  );
}

/** The page once paired (props-driven, so tests render it without a socket). */
export function RemotePanel({
  state,
  localDeadline,
  lastResults,
  offline,
  error,
  onCommand,
}: {
  state: RoomState;
  localDeadline: number | null;
  lastResults: RoundOutcome[] | null;
  offline: boolean;
  error: string | null;
  onCommand: (cmd: HostCommand, speed?: Speed) => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const closeReset = useCallback(() => setConfirmReset(false), []);
  const steps = remoteSteps(state);
  const [primary, ...others] = steps;
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const act1 = inBatch && state.act === 1;
  const title = act1 ? S.tv.act1Banner : S.tv.phase[state.phase];

  return (
    <main className="remote">
      <header className="remote__head">
        <p className="kicker">
          {S.remote.station(state.room)} {offline && `· ${S.event.reconnecting}`}
        </p>
        <h1 className="remote__title">{title}</h1>
        {inBatch && (
          <p className="kicker">
            {act1 ? S.tv.act1RoundOf(state.roundNo) : S.tv.roundOf(state.batchNo, state.roundNo, state.batchSize)}
          </p>
        )}
        {state.phase === "debrief" && <p className="kicker">{S.remote.reportStep(state.debriefStep + 1, REPORT_STEPS)}</p>}
      </header>

      <section className="remote__controls" aria-label={S.tv.controls}>
        {primary ? (
          <button type="button" className="btn btn--primary remote__primary" onClick={() => onCommand(primary)}>
            {remoteLabel(state, primary)}
          </button>
        ) : (
          state.players.length === 0 && <p className="muted">{S.remote.noPlayers}</p>
        )}
        {others.length > 0 && (
          <div className="remote__others">
            {others.map((cmd) => (
              <button key={cmd} type="button" className="btn" onClick={() => onCommand(cmd)}>
                {remoteLabel(state, cmd)}
              </button>
            ))}
          </div>
        )}
        {state.phase !== "debrief" && (
          <div className="remote__auto">
            <AutoToggle
              state={state}
              localDeadline={localDeadline}
              onToggle={() => onCommand(state.auto ? "manual" : "auto")}
              onSpeed={(sp) => onCommand("setSpeed", sp)}
            />
            {inBatch && state.deadline === null && !state.auto && <span className="muted small">{S.tv.auto.manualNote}</span>}
          </div>
        )}
        {error && (
          <p className="remote__error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="panel remote__talk">
        <p className="kicker">{S.remote.talkHead}</p>
        <ul>
          {talkingPoints(state).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <RoomList state={state} lastResults={lastResults} />

      <footer className="remote__foot">
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
          {S.remote.reset}
        </button>
      </footer>

      <Sheet open={confirmReset} onClose={closeReset} label={S.remote.resetTitle}>
        <div className="stack">
          <h2>{S.remote.resetTitle}</h2>
          <p className="muted">{S.remote.resetBody}</p>
          <button type="button" className="btn btn--primary" onClick={closeReset}>
            {S.remote.resetCancel}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              onCommand("reset");
              closeReset();
            }}
          >
            {S.remote.resetConfirm}
          </button>
        </div>
      </Sheet>
    </main>
  );
}

/** The natural next step first (the big button), then the rest of what applies now. In the report: Next, then Back. */
export function remoteSteps(state: RoomState): HostCommand[] {
  if (state.phase === "debrief") {
    const steps: HostCommand[] = [];
    if (state.debriefStep < REPORT_STEPS - 1) steps.push("reportNext");
    if (state.debriefStep > 0) steps.push("reportBack");
    return steps;
  }
  const steps = enabledSteps(state);
  const key = keyStep(state);
  return key && steps.includes(key) ? [key, ...steps.filter((c) => c !== key)] : steps;
}

const remoteLabel = (state: RoomState, cmd: HostCommand) =>
  cmd === "reportNext" ? S.tv.cmd.reportNext : cmd === "reportBack" ? S.tv.cmd.reportBack : stepLabel(state, cmd);

/** What to say now (from the facilitator guide's run of show). The tool reveal: the crystals' rule, read aloud. In
 *  Act III with clue 1: the hints and the nudge in a lull, releasing the answer after a wave; with clue 2: the answer.
 *  The phase's first point comes first (the remote fits one screen). */
export function talkingPoints(state: RoomState): readonly string[] {
  const base = phasePoints(state);
  if (state.phase === "tool") return [base[0]!, ...S.remote.talk.rule(clueTalk())];
  const act3Talk = state.act === 3 && (state.phase === "strategy" || state.phase === "batchDone");
  const clue = act3Talk && state.clue > 0 ? S.remote.talk.clue(state.clue, clueTalk(), state.phase === "batchDone") : [];
  return clue.length ? [...base.slice(0, 1), ...clue] : base;
}

function phasePoints(state: RoomState): readonly string[] {
  const t = S.remote.talk;
  switch (state.phase) {
    case "round":
      return state.act === 1 ? t.act1Round : t.round;
    case "strategy":
      return state.act === 3 ? t.act3Strategy : t.strategy;
    case "batchDone":
      return state.act === 3 ? t.act3BatchDone : t.batchDone;
    default:
      return t[state.phase];
  }
}

/** The numbers in the clue talking points, from the maths. */
export function clueTalk(): ClueTalk {
  const k = clueAnswer();
  const whole = (p: number) => `${Math.round(p * 100)}%`;
  const plan = (t: "A" | "B") =>
    S.event.clues.plan(t, formatDeg(CLUE_SETTINGS[t].greenDeg), formatDeg(CLUE_SETTINGS[t].redDeg));
  return {
    minGap: formatDeg(RULE_GAPS[0]),
    maxGap: formatDeg(RULE_GAPS.at(-1)!),
    line: whole(SURVIVAL_THRESHOLD),
    matchGap: formatDeg(k.matchGap),
    differGap: formatDeg(k.differGap),
    same: whole(k.same),
    differ: whole(k.differ),
    rate: rateText(k.rate),
    planA: plan("A"),
    planB: plan("B"),
  };
}

/** The room: who's aboard in the lobby, the lull's talking clock, who is still choosing in a round (never what anyone
 *  chose), and each pair's cause on a result. */
function RoomList({ state, lastResults }: { state: RoomState; lastResults: RoundOutcome[] | null }) {
  const lullStart = useMemo(
    () => (state.lullSince === null ? null : Date.now() - (state.serverNow - state.lullSince)),
    [state.lullSince, state.serverNow],
  );
  const talking = useElapsedMs(state.phase === "strategy" ? lullStart : null);
  const lines: { key: string; text: string; tone?: "win" | "loss" }[] = [];
  if (state.phase === "lobby" || state.phase === "briefing") {
    lines.push({ key: "aboard", text: S.remote.aboard(state.players.length, state.pairs.length) });
  } else if (state.phase === "strategy" && talking !== null) {
    lines.push({ key: "talking", text: S.tv.talking(clock(talking)) });
  } else if (state.phase === "round") {
    for (const pair of state.pairs) {
      const waiting = (["a", "b"] as const).filter((side) => !pair.answered[side]).map((side) => pair[side].name);
      lines.push({
        key: `p${pair.id}`,
        text: S.remote.pairLine(pair.id, waiting.length ? S.tv.stillChoosing(waiting.join(", ")) : S.tv.allChosen),
      });
    }
  } else if (state.phase === "roundResult" && lastResults) {
    for (const r of lastResults) {
      lines.push({
        key: `p${r.pairId}`,
        text: S.remote.pairLine(r.pairId, `${r.win ? "✓" : "✗"} ${S.outcome[r.cause].title}`),
        tone: r.win ? "win" : "loss",
      });
    }
  }
  if (lines.length === 0) return null;
  return (
    <section className="panel remote__room" aria-live="polite">
      <p className="kicker">{S.remote.roomHead}</p>
      <ul>
        {lines.map((l) => (
          <li key={l.key} className={l.tone ? `remote__line--${l.tone}` : undefined}>
            {l.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** m:ss, for the lull's talking clock. */
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
