// A batch of rounds. Timers live here; the store decides everything else.
// Buttons fire on pointer-down for speed; a second event in the same round is ignored by the store.
// Each result stays until the player taps Next round (or after RESULT_AUTO_MS, so a batch can't stall).
// Keyboard: A / ← = ANTICLOCKWISE, C / → = CLOCKWISE in Act II; Space / Enter = MEASURE in Act III during a round,
// and Next round on a result.
import { useEffect } from "react";
import { playSfx } from "../audio/sfx.ts";
import { Countdown } from "../components/Countdown.tsx";
import { Dial } from "../components/Dial.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { CommsDark } from "../components/RadioLine.tsx";
import { SensorLight } from "../components/SensorLight.tsx";
import { StabilityMeter } from "../components/StabilityMeter.tsx";
import { BATCH_SIZE, LEAD_MS, RESULT_AUTO_MS, ROUND_MS } from "../config.ts";
import { dialFor, type RoundResult, type Valve } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { actOf, displayedStability, useSolo } from "./soloStore.ts";

export function Batch() {
  const s = useSolo((st) => st);
  const { round, phase, plan, crewPlan, tuning, advance, timeout, answer, measure } = s;
  const act = actOf(phase);
  const batchNo = (act === 2 ? s.act2Batches : s.act3Batches) + 1;

  // Round loop: lead-in → light → (answer | timeout) → result → next light … → readout.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (!round) t = setTimeout(() => advance(Date.now()), LEAD_MS);
    else if (round.result) t = setTimeout(() => advance(Date.now()), RESULT_AUTO_MS);
    else t = setTimeout(() => timeout(Date.now()), Math.max(0, round.deadline - Date.now()) + 20);
    return () => clearTimeout(t);
  }, [round, advance, timeout]);

  useEffect(() => {
    if (round?.result?.win) playSfx("win", "solo");
  }, [round?.result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      const next = k === " " || k === "enter";
      if (round?.result && next) {
        e.preventDefault();
        advance(Date.now());
      } else if (act === 2 && (k === "a" || k === "arrowleft")) answer(ANTICLOCKWISE, Date.now());
      else if (act === 2 && (k === "c" || k === "arrowright")) answer(CLOCKWISE, Date.now());
      else if (act === 3 && next) {
        e.preventDefault();
        measure(Date.now());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, round, answer, measure, advance]);

  const live = round && !round.result;
  const planned: Valve | null = round ? (round.x === 0 ? plan.onGreen : plan.onRed) : null;

  return (
    <ScreenLayout
      className="batch"
      actionsUnder="main"
      // Landscape only: the ring, idle while the round is live (it must not show the crewmate's sensor), then the result.
      side={<RingDiagram result={round?.result ?? undefined} idle={!round?.result} />}
      header={
        <div className="meter__head">
          <span className="kicker">{S.batch.label(batchNo)}</span>
          <span className="kicker">{round ? S.batch.round(round.n, BATCH_SIZE) : ""}</span>
        </div>
      }
      actions={
        round?.result ? (
          <button className="btn btn--primary" onClick={() => advance(Date.now())}>
            {S.batch.next}
            <small>{S.batch.nextSub}</small>
          </button>
        ) : (
        live &&
        (act === 2 ? (
          <div className="pumps">
            {[ANTICLOCKWISE, CLOCKWISE].map((v) => (
              <button key={v} className="btn pumpbtn" onPointerDown={() => answer(v, Date.now())}
                onClick={() => answer(v, Date.now())}>
                <span className="pumpbtn__icon">
                  <PumpIcon pump={v} />
                </span>
                {S.pump[v]}
                {planned === v && <span className="pumpbtn__plan">{S.batch.planTag}</span>}
              </button>
            ))}
          </div>
        ) : (
          <button className="btn measure" onPointerDown={() => measure(Date.now())}
            onClick={() => measure(Date.now())}>
            {S.batch.measure}
          </button>
        ))
        )
      }
    >
      <StabilityMeter value={displayedStability(s)} label={S.readout.stability} showCeiling={act === 3} showLimit={act === 3} />
      <Countdown id={round ? round.n : "lead"} ms={round ? ROUND_MS : LEAD_MS} paused={!live} />
      <CommsDark />
      {act === 2 && !round?.result && <p className="agreed">{S.batch.agreed(plan, crewPlan)}</p>}

      {!round && (
        <div className="stack screen--center spacer">
          <SensorLight light={null} label={S.batch.yourLight} />
          <p className="muted" style={{ textAlign: "center" }}>
            {S.batch.incoming}
          </p>
        </div>
      )}

      {live && (
        <>
          <SensorLight light={round.x} label={S.batch.yourLight} />
          {act === 3 && <Dial value={dialFor(tuning, round.x)} small />}
        </>
      )}

      {round?.result && <RoundOutcome result={round.result} />}
    </ScreenLayout>
  );
}

/** The round's outcome: the cause, one sentence of station telemetry on why, and (on phones and portrait) the ring
 *  with both sensors and both pumps. On landscape the ring is the side column. Comms are dark: no crewmate text. */
function RoundOutcome({ result }: { result: RoundResult }) {
  const title = S.outcome[roundCause(result)].title;
  return (
    <div className={`result spacer ${result.win ? "result--win" : "result--loss"}`} role="status">
      <div className="result__verdict">{result.win ? "✓ " : "✗ "}{title}</div>
      <p className="telemetry">
        <span className="telemetry__head">{S.telemetry.head}</span> {S.telemetry.why(result)}
      </p>
      <div className="only-stacked result__ring">
        <RingDiagram result={result} small />
      </div>
    </div>
  );
}
