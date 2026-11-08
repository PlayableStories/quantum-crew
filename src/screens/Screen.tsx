// The shared TV / projector: room code + QR, the station, pooled stability, per-pair meters, round timer,
// and the facilitator's host controls. Readable from across a room.
// The night shift: the briefing (the background, for pairs), Act I's rounds with each pair's cause, then the storm
// (static, then the storm log) before the first lull.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Countdown } from "../components/Countdown.tsx";
import { StabilityMeter, pct } from "../components/StabilityMeter.tsx";
import { atlasUrl } from "../assets/atlas/manifest.ts";
import { Crystals } from "../components/EntanglementSurface.tsx";
import { RevealField } from "../solo/ToolReveal.tsx";
import { playSfx } from "../audio/sfx.ts";
import { CreditsList } from "../components/CreditsList.tsx";
import { SeatName } from "../components/AiBadge.tsx";
import { CrewIcon } from "../components/CrewIcon.tsx";
import { MuteToggle } from "../components/MuteToggle.tsx";
import { QuantumBackdrop } from "../components/QuantumBackdrop.tsx";
import { fmt } from "../components/DebriefParts.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { RadioLine } from "../components/RadioLine.tsx";
import { RingDiagram } from "../components/RingDiagram.tsx";
import {
  OPTIMAL_TUNING,
  SURVIVAL_THRESHOLD,
  classicalExpectedWinRate,
  exactOpenRates,
  quantumExpectedWinRate,
  type TuningConfig,
} from "../shared/chsh.ts";
import { CrystalCases } from "../components/CrystalCases.tsx";
import { NoSignalling, PlanVsCrystals, ThreeNumbers } from "../components/ReportParts.tsx";
import { crewReport } from "../shared/report.ts";
import { formatDeg } from "../components/Dial.tsx";
import { ALL_CELLS, expectedBoard, planId, type Board } from "../shared/plans.ts";
import { FourCases } from "../components/FourCases.tsx";
import { PlanBoard } from "../components/PlanBoard.tsx";
import { useHost } from "../net/hostStore.ts";
import { AutoToggle, enabledSteps, keyStep, stepLabel } from "./hostSteps.tsx";
import { useElapsedMs, useRemainingMs } from "../net/useCountdown.ts";
import { decisionMs, resultMs } from "../shared/pace.ts";
import { Sheet } from "../components/Sheet.tsx";
import { ClueList, CrystalRuleTable } from "../components/CrystalPlan.tsx";
import { fetchStationInfo, joinUrl, remoteUrl, loadChosenAddress, pickJoinOrigin, saveChosenAddress } from "../net/joinOrigin.ts";
import { roundIdOf, type Speed, type HostCommand, type PairInfo, type RateSummary, type RoomState, type RoundOutcome, type StationInfo, type JoinAddress } from "../shared/protocol.ts";
import { S } from "../strings.ts";

const rate = (r: RateSummary) => (r.rounds ? r.wins / r.rounds : null);

export function Screen() {
  const { status, state, localDeadline, results, remoteKey, error, start, command } = useHost();
  const [remoteOpen, setRemoteOpen] = useState(false);
  const closeRemote = useCallback(() => setRemoteOpen(false), []);
  useEffect(() => start(), [start]);
  useTvSounds(state, results);
  // Where phones join: asked from the server once (see net/joinOrigin.ts for the order).
  const [info, setInfo] = useState<StationInfo | null>(null);
  // The facilitator's pick among the laptop's addresses ("Not working? Try…"), kept across reloads.
  const [chosen, setChosen] = useState<string | null>(() => loadChosenAddress());
  useEffect(() => {
    void fetchStationInfo().then(setInfo);
  }, []);

  if (!state) {
    return (
      <main className="screen screen--center">
        <p className="muted">{status === "closed" ? S.event.reconnecting : S.event.connecting}</p>
      </main>
    );
  }

  const join = pickJoinOrigin(info, location, chosen);
  const url = joinUrl(join.origin, state.room);
  const actRate = state.act === 1 ? state.stability.act1 : state.act === 2 ? state.stability.act2 : state.stability.act3;
  // Act I has its own gauge (every round winnable); the station's rolling gauge starts with the first storm wave.
  const act1 = state.act === 1;
  const gauge = act1 ? rate(state.stability.act1) : state.stability.rolling;
  const lobby = state.phase === "lobby";

  const quantum = state.act === 3 && state.phase !== "debrief";
  return (
    // After a wave the pairs' four cases take the whole width (the join panel and pair list step aside).
    <main
      className={`tv ${quantum ? "quantum" : ""} ${state.phase === "batchDone" && state.act !== 1 ? "tv--cases" : ""} ${
        state.phase === "debrief" ? "tv--wide" : ""
      }`}
    >
      {quantum && <QuantumBackdrop />}
      <header className="tv__head">
        <p className="kicker">{S.title}</p>
        <div className="screen-top">
          <p className="kicker">
            {S.tv.station(state.room)} {status !== "open" && `· ${S.event.reconnecting}`}
          </p>
          <button
            type="button"
            className={`btn btn--ghost tv__remote ${state.remotes > 0 ? "tv__remote--on" : ""}`}
            aria-haspopup="dialog"
            onClick={() => setRemoteOpen(true)}
          >
            {state.remotes > 0 ? S.tv.remote.connected(state.remotes) : S.tv.remote.button}
          </button>
          <MuteToggle where="tv" />
        </div>
      </header>
      <Sheet open={remoteOpen} onClose={closeRemote} label={S.tv.remote.title}>
        {remoteKey && (
          <RemotePairing
            url={remoteUrl(join.origin, state.room, remoteKey)}
            remotes={state.remotes}
            onUnpair={() => command("unpairRemotes")}
          />
        )}
      </Sheet>

      <section className="tv__main">
        {state.phase !== "debrief" && <PhaseBanner state={state} localDeadline={localDeadline} />}
        {/* Act III: the situation, what players can do now, and the question (the clue ladder replaced the hint). */}
        {state.act === 3 && ["tool", "strategy", "round", "roundResult"].includes(state.phase) && (
          <Explainer state={state} compact={state.phase !== "tool"} />
        )}
        {state.phase === "briefing" ? (
          <BriefingPanel />
        ) : state.phase === "storm" ? (
          <StormPanel localDeadline={localDeadline} rate={gauge} />
        ) : state.phase === "batchDone" && state.act === 2 ? (
          <WaveCases state={state} />
        ) : state.phase === "batchDone" && state.act === 3 ? (
          <CrystalWave state={state} />
        ) : state.phase === "ceiling" ? (
          <CeilingPanel state={state} />
        ) : state.phase === "tool" ? (
          <ToolPanel clue={state.clue} />
        ) : state.phase === "strategy" && state.act === 3 ? (
          <CrystalLull state={state} />
        ) : state.phase === "debrief" ? (
          <TvDebrief state={state} onCommand={command} />
        ) : state.phase === "resolution" ? (
          <ResolutionPanel saved={state.stationSaved} plansRate={state.savedDialsRate ?? state.crewDialsRate} />
        ) : (
          <StationVisual rate={gauge} />
        )}
        <div
          className="panel"
          hidden={
            ["debrief", "briefing", "storm", "ceiling", "tool", "resolution"].includes(state.phase) ||
            (state.phase === "strategy" && state.act === 3) || // the rule and the clues need the room
            (state.phase === "batchDone" && state.act !== 1) // the pairs' four cases need the room
          }
        >
          <StabilityMeter
            value={gauge}
            label={act1 ? S.tv.act1Pooled : S.tv.pooled}
            showCeiling={state.ceilingRevealed}
            showLimit={state.toolUnlocked}
          />
          {actRate.rounds > 0 && (
            <p className="muted">
              {S.tv.allTime(state.act, pct(actRate.wins / actRate.rounds), actRate.rounds)}
              {actRate.timeouts > 0 && ` · ${S.tv.timeouts(actRate.timeouts)}`}
            </p>
          )}
        </div>
      </section>

      <aside className="tv__side">
        <JoinPanel
          url={url}
          code={state.room}
          big={lobby}
          warning={join.warning}
          alternatives={join.alternatives}
          onChoose={(address) => {
            saveChosenAddress(address);
            setChosen(address);
          }}
        />
        <Pairs
          state={state}
          lastResults={
            state.phase === "roundResult" && results?.roundId === roundIdOf(state.act, state.batchNo, state.roundNo)
              ? results.results
              : null
          }
        />
      </aside>

      <HostControls state={state} localDeadline={localDeadline} onCommand={command} error={error} />
    </main>
  );
}

/**
 * TV sounds: a chime when most pairs held a round, the alarm when pooled stability drops below the survival line
 * (or a batch ends below it), and the reveal when the tool unlocks.
 */
function useTvSounds(state: RoomState | null, results: { roundId: string; results: { win: boolean }[] } | null) {
  const prev = useRef<{ roundId?: string; rolling: number | null; phase?: string }>({ rolling: null });
  useEffect(() => {
    const p = prev.current;
    if (results && results.roundId !== p.roundId) {
      p.roundId = results.roundId;
      const wins = results.results.filter((r) => r.win).length;
      if (results.results.length && wins * 2 >= results.results.length) playSfx("win", "tv");
    }
  }, [results]);
  useEffect(() => {
    if (!state) return;
    const p = prev.current;
    const r = state.stability.rolling;
    const crossed = p.rolling !== null && r !== null && p.rolling >= SURVIVAL_THRESHOLD && r < SURVIVAL_THRESHOLD;
    const batchLow =
      state.phase === "batchDone" && p.phase !== "batchDone" && !!state.lastBatch &&
      state.lastBatch.wins / Math.max(1, state.lastBatch.rounds) < SURVIVAL_THRESHOLD;
    if (crossed || batchLow) playSfx("alarm", "tv");
    if (state.phase === "tool" && p.phase !== "tool") playSfx("reveal", "tv");
    p.rolling = r;
    p.phase = state.phase;
  }, [state]);
}

function PhaseBanner({ state, localDeadline }: { state: RoomState; localDeadline: number | null }) {
  const left = useRemainingMs(localDeadline);
  // The lull: how long the room has been talking (a guide for the facilitator, never a countdown).
  const lullStart = useMemo(
    () => (state.lullSince === null ? null : Date.now() - (state.serverNow - state.lullSince)),
    [state.lullSince, state.serverNow],
  );
  const talking = useElapsedMs(state.phase === "strategy" ? lullStart : null);
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const act1 = inBatch && state.act === 1;
  // The countdown follows the room's deadline (a round, or an auto result), so a switch shows at once; none in manual.
  const totalMs = state.phase === "round" ? decisionMs(state.speed, state.act) : resultMs(state.speed, state.act);
  const title =
    state.phase === "storm" && !(left !== null && left > 0) ? S.storm.logTitle : act1 ? S.tv.act1Banner : S.tv.phase[state.phase];
  return (
    <div className={`tv__banner tv__banner--${state.phase} ${act1 ? "tv__banner--act1" : ""}`}>
      <h1>{title}</h1>
      {state.phase === "strategy" && talking !== null && <p className="tv__talking">{S.tv.talking(clock(talking))}</p>}
      {inBatch && (
        <>
          <p className="kicker">
            {act1 ? S.tv.act1RoundOf(state.roundNo) : S.tv.roundOf(state.batchNo, state.roundNo, state.batchSize)}
          </p>
          {/* The plans went into the wave locked (Acts II and III). */}
          {/* The plans went into the wave locked (Acts II and III); in manual, the note shares the line. */}
          {(!act1 || (state.deadline === null && !state.auto)) && (
            <div className="tv__banner-row">
              {!act1 && <p className="tv__locked">🔒 {S.event.locked.tvStamp}</p>}
              {state.deadline === null && !state.auto && <p className="tv__manual muted small">{S.tv.auto.manualNote}</p>}
            </div>
          )}
          {state.deadline !== null && (
            <Countdown
              id={`${roundIdOf(state.act, state.batchNo, state.roundNo)}-${state.phase}-${state.deadline}`}
              ms={totalMs}
              left={state.deadline - state.serverNow}
              paused={false}
            />
          )}
        </>
      )}
      {state.phase === "batchDone" && state.lastBatch && (
        <p className="tv__big">{S.tv.batchHeld(pct(state.lastBatch.wins / Math.max(1, state.lastBatch.rounds)))}</p>
      )}
    </div>
  );
}

/** m:ss, for the lull's talking clock. */
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** When the night shift starts: the background for pairs, tonight's routine and the rule's ring. */
function BriefingPanel() {
  const B = S.event.briefing;
  return (
    <div className="panel tv__briefing">
      <div className="stack">
        <p className="kicker">{B.kicker}</p>
        {B.lines.map((l) => (
          <p key={l} className="tv__line">
            {l}
          </p>
        ))}
        <p className="muted">{S.intro.survival}</p>
      </div>
      <div className="stack tv__briefing-rule">
        <RingDiagram labels={{ a: S.event.table("A"), b: S.event.table("B") }} />
        <p className="tv__line">{S.rule.quick}</p>
        <p className="tv__line">
          <strong>{B.routine}</strong>
        </p>
      </div>
    </div>
  );
}

/** The storm: the station log's last words break up under static, then (once the static's deadline passes) the storm
 *  log. Static flickers only with motion allowed (see .radio-line__static). */
function StormPanel({ localDeadline, rate: value }: { localDeadline: number | null; rate: number | null }) {
  const left = useRemainingMs(localDeadline);
  const static_ = left !== null && left > 0;
  return (
    <div className="stack tv__storm">
      {static_ ? (
        <RadioLine who={S.event.storm.log} quoted={false} lines={[S.event.storm.logBreak]} interference />
      ) : (
        <div className="panel stack">
          <p className="kicker">{S.storm.logKicker}</p>
          {S.storm.log.map((l) => (
            <p key={l} className="tv__line">
              {l}
            </p>
          ))}
          <p className="muted">{S.event.storm.next}</p>
        </div>
      )}
      <StationVisual rate={value} storm />
    </div>
  );
}

/** After an Act II wave: each pair's locked plans, case by case (exact), with the true rate, this wave's score and,
 *  when the wave beat 80% but the plan can't, the luck line. */
export function WaveCases({ state }: { state: RoomState }) {
  return (
    <div className={`tv__cases tv__cases--${Math.min(state.pairs.length, 4)}`}>
      <p className="muted tv__cases-head">
        {S.readout.casesHead} · {S.event.casesOrder}
      </p>
      {state.pairs.map((pair) => {
        if (!pair.locked) return null;
        const wave = pair.lastWave;
        const waveRate = wave && wave.rounds ? wave.wins / wave.rounds : null;
        const trueRate = classicalExpectedWinRate(pair.locked.a, pair.locked.b);
        const lucky = waveRate !== null && waveRate >= SURVIVAL_THRESHOLD && trueRate < SURVIVAL_THRESHOLD;
        return (
          <div key={pair.id} className="panel stack tv__pair-cases">
            <p className="kicker">
              {S.tv.pair(pair.id)} ·{" "}
              {S.event.pairPlans(
                pair.a.name,
                S.plans.short[planId(pair.locked.a)]!,
                pair.b.name,
                S.plans.short[planId(pair.locked.b)]!,
              )}
            </p>
            <FourCases plan={pair.locked.a} crewPlan={pair.locked.b} order={S.event.casesOrder} />
            <p className="tv__pair-total">
              <strong>{S.readout.caseTotal(Math.round(trueRate * 4), whole(trueRate))}</strong>
              {wave && <span className="muted"> · {S.event.waveHeld(wave.wins, wave.rounds)}</span>}
            </p>
            {lucky && <p className="tv__luck">{S.event.lucky(whole(trueRate))}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Exact rates are whole numbers (25%, 50%, 75%, 100%). */
const whole = (r: number) => `${Math.round(r * 100)}%`;

/** The engineering report: the 4×4 board at exact rates, every pairing the crew played marked as tried and
 *  engineering's corner mark on the rest. The same copy as solo, which reads as plural for a crew. */
export function CeilingPanel({ state }: { state: RoomState }) {
  const exact = expectedBoard();
  const tried = new Set(state.triedPlans);
  const board: Board = Object.fromEntries(
    ALL_CELLS.map((k) => [k, { rate: exact[k], by: tried.has(k) ? "player" : "engineering" }]),
  );
  return (
    <div className="panel tv__ceiling">
      <div className="stack">
        <div className="huge">{S.ceiling.big}</div>
        <p className="tv__line">
          <strong>{S.ceiling.engineering(tried.size, ALL_CELLS.length - tried.size)}</strong>
        </p>
        <p className="tv__line">{S.ceiling.truth}</p>
      </div>
      <div className="stack">
        <PlanBoard board={board} labels={S.event.board} />
        <p className="tv__line tv__beat">
          <strong>{S.event.beats.ceilingRoom}</strong>
        </p>
      </div>
    </div>
  );
}

/** The tool reveal: the supply pod from engineering, with its note (the crystals carry no messages). */
export function ToolPanel({ clue = 1 }: { clue?: number }) {
  const art = atlasUrl("entanglement-reveal");
  return (
    <div className="tv__tool">
      <div className="panel stack reveal">
        <RevealField art={art} />
        <Crystals />
        <p className="kicker">{S.event.pod.kicker}</p>
        {S.event.pod.lines.map((l) => (
          <p key={l} className="tv__line">
            {l}
          </p>
        ))}
      </div>
      {/* Clue 1 comes with the tool: the crystals' rule and the question. */}
      <div className="panel stack tv__clues">
        <ClueList clue={clue} pairs={[]} className="clues--tv" titlesInline />
      </div>
    </div>
  );
}

/** The TV in Act III: the situation in one line, what players can do now, and the question they're working on. */
export function Explainer({ state, compact = false, withNow = false }: { state: RoomState; compact?: boolean; withNow?: boolean }) {
  const E = S.event.explain;
  const step = state.phase === "roundResult" ? "round" : (state.phase as "tool" | "strategy" | "round" | "batchDone");
  const lines = E[step];
  if (!lines) return null;
  if (compact)
    return (
      <p className="tv__explain tv__explain--compact">
        {withNow && (
          <>
            <b>{E.labels.now}:</b> {lines.now}{" "}
          </>
        )}
        <b>{E.labels.can}:</b> {lines.can} <b>{E.labels.question}:</b> {lines.question}
      </p>
    );
  return (
    <dl className="tv__explain">
      <div>
        <dt>{E.labels.now}</dt>
        <dd>{lines.now}</dd>
      </div>
      <div>
        <dt>{E.labels.can}</dt>
        <dd>{lines.can}</dd>
      </div>
      <div>
        <dt>{E.labels.question}</dt>
        <dd>{lines.question}</dd>
      </div>
    </dl>
  );
}

/** The Act III lull on the TV: the crystals' rule and every clue so far (the latest in full). Clue 2 lists each
 *  pair's weakest case from its latest locked plans. */
export function CrystalLull({ state }: { state: RoomState }) {
  return (
    <div className="tv__lull3">
      <div className="panel stack">
        <p className="kicker">{S.event.crystalRule.head}</p>
        <CrystalRuleTable />
      </div>
      <div className="panel stack tv__clues">
        <ClueList
          clue={state.clue}
          pairs={state.pairs.map((p) => ({ id: p.id, plans: p.lockedDials }))}
          className="clues--tv"
          ruleTable={false}
          titlesInline
        />
      </div>
    </div>
  );
}

/** After an Act III wave: each pair's locked dials case by case (each case's exact chance if both follow their
 *  crystals), the true rate (highlighted at 80% or more), the wave's score and who followed; then the crew's
 *  followed count, its dials' average and whether that saves the station. */
export function CrystalWave({ state }: { state: RoomState }) {
  const W = S.event.wave3;
  const dials = (t: TuningConfig) => W.plan(formatDeg(t.greenDeg), formatDeg(t.redDeg));
  const crew = state.crewDialsRate;
  const followed = state.act3Followed;
  return (
    <div className={`tv__cases tv__cases--${Math.min(state.pairs.length, 4)}`}>
      <p className={`tv__crew-line ${state.stationSaved ? "tv__crew-line--saved" : ""}`}>
        {crew !== null && <strong>{crew >= SURVIVAL_THRESHOLD ? W.saved(pct(crew)) : W.notSaved(pct(crew))}</strong>}
        {followed && followed.of > 0 && <span className="muted"> · {W.crewFollowed(followed.n, followed.of)}</span>}
      </p>
      {/* What players can do now and the question, in one line (the full width belongs to the pairs' cases). */}
      <Explainer state={state} compact />
      {state.pairs.map((pair) => {
        if (!pair.lockedDials) return null;
        const { a, b } = pair.lockedDials;
        const trueRate = quantumExpectedWinRate(a, b);
        const holds = trueRate >= SURVIVAL_THRESHOLD;
        const wave = pair.lastWave;
        return (
          <div key={pair.id} className={`panel stack tv__pair-cases ${holds ? "tv__pair-cases--holds" : ""}`}>
            <p className="kicker">
              {S.tv.pair(pair.id)} · {W.pairPlans(pair.a.name, dials(a), pair.b.name, dials(b))}
            </p>
            <CrystalCases tuning={a} crew={b} order={S.event.casesOrder} gaps weakest={state.clue >= 2 && !holds} />
            <p className="tv__pair-total">
              <strong>{S.readout.trueRate(pct(trueRate))}</strong>
              {holds && <span className="tv__found"> · ✓ {W.foundIt}</span>}
              {wave && <span className="muted"> · {W.wave(wave.wins, wave.rounds)}</span>}
            </p>
            {/* The wave and the true rate disagree about 80%: luck, either way. */}
            {wave && wave.rounds > 0 && wave.wins / wave.rounds >= SURVIVAL_THRESHOLD !== holds && (
              <p className="tv__luck">{holds ? W.luckyBelow(pct(trueRate)) : W.luckyAbove(pct(trueRate))}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The debrief on the big screen: the same four steps as solo, with the whole crew's numbers. */
/** The storm passes: the station clears (calm when saved, damaged when not, as in solo), the station log says how
 *  it ended, and the room is told the radio is back. */
export function ResolutionPanel({ saved, plansRate = null }: { saved: boolean; plansRate?: number | null }) {
  return (
    <div className="stack tv__resolution">
      {saved ? <StationVisual rate={1} clearing /> : <StationVisual rate={null} damaged clearing />}
      <div className="panel stack">
        <p className="kicker">{S.resolution.kicker}</p>
        <p className="tv__line">{saved ? S.resolution.log : S.resolution.logNotSaved}</p>
        {plansRate !== null && <p className="tv__line">{S.event.resolution.plans(pct(plansRate))}</p>}
        <p className="tv__line">
          <strong>{S.event.resolution.room}</strong>
        </p>
      </div>
    </div>
  );
}

/** The incident report on the big screen: solo's four steps in the crew's version, stepped by the room (Back /
 *  Next send reportBack / reportNext, so a reconnecting TV keeps its place). */
export function TvDebrief({ state, onCommand }: { state: RoomState; onCommand: (cmd: HostCommand) => void }) {
  const steps = S.event.report.steps;
  const step = Math.min(state.debriefStep, steps.length - 1);
  const content = steps[step]!;
  const report = crewReport(state);
  const R = S.event.report;
  // The quantum-limit and no-signalling steps use the best pair's dials (if one reached 80%), else the best dials.
  const best = report.bestPair;
  const dials = best?.dials ?? { a: OPTIMAL_TUNING.A, b: OPTIMAL_TUNING.B };
  const crew = state.marginals?.crew;
  return (
    // Full TV width, nothing scrolls: the explanation on the left, the step's numbers on the right, Back / Next below.
    <div className="panel tv__debrief">
      <div className="tv__debrief-head">
        <div className="steps" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>
        <p className="kicker">{S.report.kicker}</p>
        <h1>{content.title}</h1>
      </div>
      <div className={`tv__debrief-body ${content.body.length ? "" : "tv__debrief-body--single"}`}>
        {content.body.length > 0 && (
          <div className="stack">
            {content.body.map((p) => (
              <p key={p} className="tv__line">
                {p}
              </p>
            ))}
            {step === 2 && state.marginals && <p className="muted">{S.tv.wobble}</p>}
          </div>
        )}
        <div className="stack tv__debrief-numbers">
          {step === 0 && <ThreeNumbers act1={report.act1} saved={report.saved} act3={report.act3} copy={R.three} />}
          {step === 1 && (
            <PlanVsCrystals
              dials={dials}
              label={best ? R.pairDials(best.pairId, best.a, best.b) : R.bestPlans}
              copy={R.compare}
            />
          )}
          {step === 2 && (
            <>
              <NoSignalling
                exact={exactOpenRates(dials.a, dials.b)}
                who={{ a: S.event.table("A"), b: S.event.table("B") }}
                real={crew && crew.rounds > 0 ? R.crewRounds(crew.rounds, fmt(crew.partnerGreen), fmt(crew.partnerRed)) : null}
              />

            </>
          )}
          {step === 3 && <CreditsList />}
        </div>
      </div>
      <div className="row tv__debrief-nav">
        <button className="btn" disabled={step === 0} onClick={() => onCommand("reportBack")}>
          {S.debrief.back}
        </button>
        <button className="btn btn--primary" disabled={step === steps.length - 1} onClick={() => onCommand("reportNext")}>
          {S.debrief.next}
        </button>
      </div>
    </div>
  );
}

/** The QR code and the printed link come from the same `url`, so they always match. */
/** The QR code and the printed link come from one `url`. In the lobby (`big`), when the laptop has other addresses,
 *  "Not working? Try:" offers each as a button; one click makes it the join address. */
export function JoinPanel({
  url,
  code,
  big,
  warning = false,
  alternatives = [],
  onChoose,
}: {
  url: string;
  code: string;
  big: boolean;
  warning?: boolean;
  alternatives?: JoinAddress[];
  onChoose?: (url: string) => void;
}) {
  const svg = useQr(url);
  return (
    <div className={`panel tv__join ${big ? "tv__join--big" : ""}`} data-join-url={url}>
      {svg && <div className="tv__qr" dangerouslySetInnerHTML={{ __html: svg }} />}
      <div className="stack">
        <p className="kicker">{S.tv.join}</p>
        <p className="tv__code">
          <span className="muted">{S.tv.code}</span> {code}
        </p>
        {big && <p className="muted small tv__join-link">{S.tv.joinAt(url.replace(/^https?:\/\//, ""))}</p>}
        {big && alternatives.length > 0 && (
          <p className="small tv__join-other">
            <span className="muted">{S.tv.tryOther}</span>{" "}
            {alternatives.map((a) => (
              <button
                key={a.url}
                type="button"
                className="tv__join-alt"
                aria-label={S.tv.useAddress(a.url.replace(/^https?:\/\//, ""), a.iface)}
                onClick={() => onChoose?.(a.url)}
              >
                {a.url.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </p>
        )}
        {/* The TV is open at localhost and the server has no other address: phones can't use this link. */}
        {warning && (
          <p className="tv__join-warning" role="alert">
            {S.tv.joinWarning}
          </p>
        )}
      </div>
    </div>
  );
}

/** The TV's pairing dialog for the phone remote: a QR code and link with the room's remote key, how many remotes are
 *  paired, and Unpair (a new key; paired remotes are dropped). */
export function RemotePairing({ url, remotes, onUnpair }: { url: string; remotes: number; onUnpair: () => void }) {
  const svg = useQr(url);
  return (
    <div className="stack tv__pairing" data-remote-url={url}>
      <h2>{S.tv.remote.title}</h2>
      <p className="muted">{S.tv.remote.body}</p>
      {svg && <div className="tv__qr tv__pairing-qr" dangerouslySetInnerHTML={{ __html: svg }} />}
      <p className="small tv__pairing-link">{url.replace(/^https?:\/\//, "")}</p>
      <p className="small">{S.tv.remote.warning}</p>
      <p>
        <strong>{S.tv.remote.count(remotes)}</strong>
      </p>
      <button type="button" className="btn" onClick={onUnpair}>
        {S.tv.remote.unpair}
      </button>
    </div>
  );
}

function useQr(text: string): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: "svg", margin: 1, color: { dark: "#0a0e13", light: "#eef3f8" } }).then(
      (s) => live && setSvg(s),
      () => live && setSvg(null),
    );
    return () => {
      live = false;
    };
  }, [text]);
  return svg;
}

function Pairs({ state, lastResults }: { state: RoomState; lastResults: RoundOutcome[] | null }) {
  const unseated = state.players.filter((p) => p.pairId === null);
  if (state.pairs.length === 0 && unseated.length === 0) return <p className="muted">{S.tv.noPlayers}</p>;
  // Three or four pairs: compact cards, two to a row, so the side column never scrolls.
  return (
    <div className={`stack pairs ${state.pairs.length >= 3 ? "pairs--crowded" : ""}`}>
      {state.pairs.map((pair) => (
        <PairCard key={pair.id} pair={pair} state={state} result={lastResults?.find((r) => r.pairId === pair.id) ?? null} />
      ))}
      {unseated.length > 0 && (
        <p className="muted small">
          {S.phone.waitingSeat} {unseated.map((p) => `${p.name} (${p.table})`).join(", ")}
        </p>
      )}
    </div>
  );
}

function PairCard({ pair, state, result }: { pair: PairInfo; state: RoomState; result: RoundOutcome | null }) {
  const waiting = (["a", "b"] as const).filter((side) => !pair.answered[side]).map((side) => pair[side].name);
  const r = rate(state.act === 1 ? pair.act1 : state.act === 2 ? pair.act2 : pair.act3);
  const connected = (id: string | null) => id === null || state.players.find((p) => p.id === id)?.connected;
  const seat = (side: "a" | "b") => {
    const s = pair[side];
    const answered = state.phase === "round" && pair.answered[side];
    return (
      <span className={`seat ${connected(s.playerId) ? "" : "seat--off"} ${s.playerId === null ? "seat--bot" : ""}`}>
        <CrewIcon table={side === "a" ? "A" : "B"} bot={s.playerId === null} size={28} />
        <b>{side.toUpperCase()}</b>{" "}
        {/* An away player: CORA covers their seat until they rejoin. */}
        {s.playerId !== null && !connected(s.playerId) ? (
          <SeatName name={S.tv.covering(s.name)} bot />
        ) : (
          <SeatName name={s.name} bot={s.playerId === null} />
        )}
        {answered && " ✓"}
      </span>
    );
  };
  return (
    <div className={`panel pair ${result ? (result.win ? "pair--win" : "pair--loss") : ""}`}>
      <div className="pair__head">
        <span className="kicker">
          {S.tv.pair(pair.id)}
          {(state.phase === "round" || state.phase === "roundResult") && state.act !== 1 && (
            <span className="pair__locked" title={S.event.locked.tvStamp} aria-label={S.event.locked.tvStamp}>
              {" "}🔒
            </span>
          )}
        </span>
        <strong>{r === null ? "—" : pct(r)}</strong>
      </div>
      <div className="pair__seats">
        {seat("a")}
        {seat("b")}
      </div>
      {/* While a round is open: who is still choosing (never what anyone chose). Then what happened, as on the phones.
          Either takes the mini-meter's place (there's no meter before a round). */}
      {state.phase === "round" && !result ? (
        <p className="pair__waiting">{waiting.length ? S.tv.stillChoosing(waiting.join(", ")) : S.tv.allChosen}</p>
      ) : result ? (
        <p className={`pair__cause ${result.win ? "pair__cause--win" : "pair__cause--loss"}`}>
          {result.win ? "✓ " : "✗ "}
          {S.outcome[result.cause].title}
        </p>
      ) : (
        r !== null && (
          <div className="minimeter">
            <div className={`minimeter__fill ${r >= 0.8 ? "minimeter__fill--ok" : ""}`} style={{ width: `${r * 100}%` }} />
            <div className="minimeter__line" style={{ left: "80%" }} />
          </div>
        )
      )}
    </div>
  );
}

function HostControls({
  state,
  localDeadline,
  onCommand,
  error,
}: {
  state: RoomState;
  localDeadline: number | null;
  onCommand: (c: HostCommand, speed?: Speed) => void;
  error: string | null;
}) {
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const steps = enabledSteps(state);
  const send = (cmd: HostCommand) => () => (cmd !== "reset" || confirm(S.tv.resetConfirm)) && onCommand(cmd);
  const toggle = () => onCommand(state.auto ? "manual" : "auto");

  // Keyboard for a facilitator at a laptop: Space or → for the natural next step, P for play / pause. Not while a
  // button, a field or the reset confirm has focus (Space would press that button too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, input, select, textarea, [contenteditable], dialog")) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        onCommand(state.auto ? "manual" : "auto");
      } else if (e.key === " " || e.key === "ArrowRight") {
        const cmd = keyStep(state);
        if (!cmd) return;
        e.preventDefault();
        onCommand(cmd);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onCommand]);

  return (
    <footer className="tv__controls" aria-label={S.tv.controls}>
      {steps.map((cmd, i) => (
        <button key={cmd} className={`btn ${i === 0 ? "btn--primary" : ""}`} onClick={send(cmd)}>
          {stepLabel(state, cmd)}
        </button>
      ))}
      <AutoToggle state={state} localDeadline={localDeadline} onToggle={toggle} onSpeed={(sp) => onCommand("setSpeed", sp)} />
      <button className="btn btn--ghost" onClick={send("reset")}>
        {S.tv.cmd.reset}
      </button>
      {/* The shortcuts, when Space has a step to take (not in the lobby, where nothing waits on it). */}
      {keyStep(state) && <span className="muted small tv__keys">{S.tv.keys}</span>}
      {error && <span className="tv__error">{error}</span>}
    </footer>
  );
}
