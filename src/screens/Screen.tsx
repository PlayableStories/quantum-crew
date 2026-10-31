// The shared TV / projector: room code + QR, the station, pooled stability, per-pair meters, round timer,
// and the facilitator's host controls. Readable from across a room.
// The night shift: the briefing (the background, for pairs), Act I's rounds with each pair's cause, then the storm
// (static, then the storm log) before the first lull.
import { useEffect, useMemo, useRef, useState } from "react";
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
import { OptimalDials, fmt } from "../components/DebriefParts.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { MP_ACT1_ROUND_MS, MP_ROUND_MS } from "../config.ts";
import { RadioLine } from "../components/RadioLine.tsx";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { SURVIVAL_THRESHOLD, classicalExpectedWinRate } from "../shared/chsh.ts";
import { ALL_CELLS, expectedBoard, planId, type Board } from "../shared/plans.ts";
import { FourCases } from "../components/FourCases.tsx";
import { PlanBoard } from "../components/PlanBoard.tsx";
import { useHost } from "../net/hostStore.ts";
import { useRemainingMs } from "../net/useCountdown.ts";
import { fetchStationInfo, joinUrl, pickJoinOrigin } from "../net/joinOrigin.ts";
import { HOST_COMMANDS, roundIdOf, type HostCommand, type PairInfo, type RateSummary, type RoomState, type RoundOutcome, type StationInfo } from "../shared/protocol.ts";
import { S } from "../strings.ts";

const rate = (r: RateSummary) => (r.rounds ? r.wins / r.rounds : null);

export function Screen() {
  const { status, state, localDeadline, results, error, start, command } = useHost();
  useEffect(() => start(), [start]);
  // Facilitator-only, so it lives on the TV: the hint and the debrief step.
  const [hint, setHint] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (state?.phase !== "debrief") setStep(0);
    if (!state?.toolUnlocked) setHint(false);
  }, [state?.phase, state?.toolUnlocked]);
  useTvSounds(state, results);
  // Where phones join: asked from the server once (see net/joinOrigin.ts for the order).
  const [info, setInfo] = useState<StationInfo | null>(null);
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

  const join = pickJoinOrigin(info, location);
  const url = joinUrl(join.origin, state.room);
  const actRate = state.act === 1 ? state.stability.act1 : state.act === 2 ? state.stability.act2 : state.stability.act3;
  // Act I has its own gauge (every round winnable); the station's rolling gauge starts with the first storm wave.
  const act1 = state.act === 1;
  const gauge = act1 ? rate(state.stability.act1) : state.stability.rolling;
  const lobby = state.phase === "lobby";

  const quantum = state.act === 3 && state.phase !== "debrief";
  return (
    // After an Act II wave the pairs' four cases take the whole width (the join panel and pair list step aside).
    <main className={`tv ${quantum ? "quantum" : ""} ${state.phase === "batchDone" && state.act === 2 ? "tv--cases" : ""}`}>
      {quantum && <QuantumBackdrop />}
      <header className="tv__head">
        <p className="kicker">{S.title}</p>
        <div className="screen-top">
          <p className="kicker">
            {S.tv.station(state.room)} {status !== "open" && `· ${S.event.reconnecting}`}
          </p>
          <MuteToggle where="tv" />
        </div>
      </header>

      <section className="tv__main">
        {state.phase !== "debrief" && <PhaseBanner state={state} localDeadline={localDeadline} />}
        {hint && state.act === 3 && state.phase !== "debrief" && <p className="tv__hint">{S.tuning.hint}</p>}
        {state.phase === "briefing" ? (
          <BriefingPanel />
        ) : state.phase === "storm" ? (
          <StormPanel localDeadline={localDeadline} rate={gauge} />
        ) : state.phase === "batchDone" && state.act === 2 ? (
          <WaveCases state={state} />
        ) : state.phase === "ceiling" ? (
          <CeilingPanel state={state} />
        ) : state.phase === "tool" ? (
          <ToolPanel />
        ) : state.phase === "debrief" ? (
          <TvDebrief state={state} step={step} setStep={setStep} />
        ) : (
          <StationVisual rate={gauge} />
        )}
        <div
          className="panel"
          hidden={
            ["debrief", "briefing", "storm", "ceiling"].includes(state.phase) ||
            (state.phase === "batchDone" && state.act === 2) // the pairs' four cases need the room
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
        <JoinPanel url={url} code={state.room} big={lobby} warning={join.warning} />
        <Pairs
          state={state}
          lastResults={
            state.phase === "roundResult" && results?.roundId === roundIdOf(state.act, state.batchNo, state.roundNo)
              ? results.results
              : null
          }
        />
      </aside>

      <HostControls state={state} onCommand={command} error={error} hint={hint} onHint={() => setHint((h) => !h)} />
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
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const act1 = inBatch && state.act === 1;
  const title =
    state.phase === "storm" && !(left !== null && left > 0) ? S.storm.logTitle : act1 ? S.tv.act1Banner : S.tv.phase[state.phase];
  return (
    <div className={`tv__banner tv__banner--${state.phase} ${act1 ? "tv__banner--act1" : ""}`}>
      <h1>{title}</h1>
      {state.phase === "strategy" && left !== null && <div className="tv__clock">{Math.ceil(left / 1000)}</div>}
      {inBatch && (
        <>
          <p className="kicker">
            {act1 ? S.tv.act1RoundOf(state.roundNo) : S.tv.roundOf(state.batchNo, state.roundNo, state.batchSize)}
          </p>
          <Countdown
            id={roundIdOf(state.act, state.batchNo, state.roundNo)}
            ms={act1 ? MP_ACT1_ROUND_MS : MP_ROUND_MS}
            paused={state.phase !== "round"}
          />
        </>
      )}
      {state.phase === "batchDone" && state.lastBatch && (
        <p className="tv__big">{S.tv.batchHeld(pct(state.lastBatch.wins / Math.max(1, state.lastBatch.rounds)))}</p>
      )}
    </div>
  );
}

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
      <PlanBoard board={board} labels={S.event.board} />
    </div>
  );
}

function ToolPanel() {
  const art = atlasUrl("entanglement-reveal");
  return (
    <div className="panel stack reveal">
      <RevealField art={art} />
      <Crystals />
      {S.tv.toolLines.map((l) => (
        <p key={l} className="tv__line">
          {l}
        </p>
      ))}
    </div>
  );
}

/** The debrief on the big screen: the same four steps as solo, with the whole crew's numbers. */
function TvDebrief({ state, step, setStep }: { state: RoomState; step: number; setStep: (n: number) => void }) {
  const steps = S.debrief.steps;
  const content = steps[step]!;
  const act2 = rate(state.stability.act2);
  const act3 = rate(state.stability.act3);
  return (
    <div className="panel stack tv__debrief">
      <div className="steps" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <p className="kicker">{S.debrief.kicker}</p>
      <h1>{content.title}</h1>
      {content.body.map((p) => (
        <p key={p} className="tv__line">
          {p}
        </p>
      ))}
      {step === 0 && act2 !== null && <p className="tv__big">{S.tv.crewAct(2, pct(act2), state.stability.act2.rounds)}</p>}
      {step === 1 && (
        <>
          {act3 !== null && <p className="tv__big">{S.tv.crewAct(3, pct(act3), state.stability.act3.rounds)}</p>}
          <div className="row">
            <OptimalDials table="A" />
            <OptimalDials table="B" />
          </div>
        </>
      )}
      {step === 2 && state.marginals && (
        <>
          <MarginalTable {...state.marginals} />
          <p className="muted small">{S.tv.wobble}</p>
        </>
      )}
      {step === 3 && <CreditsList />}
      <div className="row tv__debrief-nav">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {S.debrief.back}
        </button>
        <button className="btn btn--primary" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>
          {S.debrief.next}
        </button>
      </div>
    </div>
  );
}

/** Each seat's own pump: clockwise rate when the partner's sensor read COOL vs HOT. Both ≈ 50%: no message got through. */
function MarginalTable({ rows, crew }: NonNullable<RoomState["marginals"]>) {
  const cell = (r: number | null) => (
    <td>
      <div className="bar__track">
        <div className="bar__fill" style={{ width: `${(r ?? 0) * 100}%` }} />
        <div className="bar__half" />
      </div>
      <span>{fmt(r)}</span>
    </td>
  );
  return (
    <table className="marginals">
      <thead>
        <tr>
          <th>{S.tv.marginalHead.player}</th>
          <th>{S.tv.marginalHead.cool}</th>
          <th>{S.tv.marginalHead.hot}</th>
          <th>{S.tv.marginalHead.rounds}</th>
        </tr>
      </thead>
      <tbody>
        <tr className="marginals__crew">
          <td>{S.tv.wholeCrew}</td>
          {cell(crew.partnerGreen)}
          {cell(crew.partnerRed)}
          <td className="muted">{crew.rounds}</td>
        </tr>
        {rows.map((m) => (
          <tr key={`${m.table}-${m.name}`}>
            <td>
              {m.name} <span className="muted">({m.table})</span>
            </td>
            {cell(m.partnerGreen)}
            {cell(m.partnerRed)}
            <td className="muted">{m.rounds}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The QR code and the printed link come from the same `url`, so they always match. */
export function JoinPanel({ url, code, big, warning = false }: { url: string; code: string; big: boolean; warning?: boolean }) {
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
  const r = rate(state.act === 1 ? pair.act1 : state.act === 2 ? pair.act2 : pair.act3);
  const connected = (id: string | null) => id === null || state.players.find((p) => p.id === id)?.connected;
  const seat = (side: "a" | "b") => {
    const s = pair[side];
    const answered = state.phase === "round" && pair.answered[side];
    return (
      <span className={`seat ${connected(s.playerId) ? "" : "seat--off"} ${s.playerId === null ? "seat--bot" : ""}`}>
        <CrewIcon table={side === "a" ? "A" : "B"} bot={s.playerId === null} size={28} />
        <b>{side.toUpperCase()}</b> <SeatName name={s.name} bot={s.playerId === null} />
        {answered && " ✓"}
      </span>
    );
  };
  return (
    <div className={`panel pair ${result ? (result.win ? "pair--win" : "pair--loss") : ""}`}>
      <div className="pair__head">
        <span className="kicker">{S.tv.pair(pair.id)}</span>
        <strong>{r === null ? "—" : pct(r)}</strong>
      </div>
      <div className="pair__seats">
        {seat("a")}
        {seat("b")}
      </div>
      {/* What happened, as on the phones; it takes the mini-meter's place while it shows (no meter before a round). */}
      {result ? (
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
  onCommand,
  error,
  hint,
  onHint,
}: {
  state: RoomState;
  onCommand: (c: HostCommand) => void;
  error: string | null;
  hint: boolean;
  onHint: () => void;
}) {
  const inBatch = state.phase === "round" || state.phase === "roundResult";
  const hasPlayers = state.players.length > 0;
  const enabled = useMemo<Record<HostCommand, boolean>>(
    () => ({
      startNightShift: hasPlayers && state.phase === "lobby",
      // From the lobby these still skip the night shift and go straight to Act II.
      startStrategy: !inBatch && hasPlayers && !["briefing", "strategy", "ceiling", "debrief"].includes(state.phase),
      startBatch: !inBatch && hasPlayers && !["ceiling", "debrief"].includes(state.phase),
      revealCeiling: !inBatch && state.act === 2 && state.stability.act2.rounds > 0 && state.phase !== "ceiling",
      // DECISION: the tool unlocks after the ceiling has been revealed, to keep the learning arc in order.
      unlockTool: !inBatch && state.ceilingRevealed && !state.toolUnlocked,
      debrief: !inBatch && state.act === 3 && state.stability.act3.rounds > 0 && state.phase !== "debrief",
      reset: true,
    }),
    [inBatch, hasPlayers, state.phase, state.act, state.stability.act2.rounds, state.stability.act3.rounds, state.ceilingRevealed, state.toolUnlocked],
  );
  const order = HOST_COMMANDS;
  return (
    <footer className="tv__controls">
      <span className="kicker">{S.tv.controls}</span>
      {order.map((cmd) => (
        <button
          key={cmd}
          className={`btn ${cmd === "reset" ? "btn--ghost" : ""}`}
          disabled={!enabled[cmd]}
          onClick={() => (cmd !== "reset" || confirm(S.tv.resetConfirm)) && onCommand(cmd)}
        >
          {cmd === "startBatch" && state.phase === "briefing" ? S.tv.startRounds : S.tv.cmd[cmd]}
        </button>
      ))}
      {state.act === 3 && state.phase !== "debrief" && (
        <button className={`btn ${hint ? "btn--selected" : ""}`} onClick={onHint}>
          {hint ? S.tv.hideHint : S.tv.showHint}
        </button>
      )}
      {error && <span className="tv__error">{error}</span>}
    </footer>
  );
}
