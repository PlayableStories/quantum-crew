// A batch of rounds. Timers live here; the store decides everything else.
// Buttons fire on pointer-down for speed; a second event in the same round is ignored by the store.
// Each result stays until the player taps Next round (or after RESULT_AUTO_MS, so a batch can't stall).
// Act III: MEASURE reads the crystal, which suggests a pump; the player then sets the pump themselves.
// Keyboard: A / ← = ANTICLOCKWISE, C / → = CLOCKWISE (Act III: once the crystal has spoken). Act III: Space / Enter =
// MEASURE, then Enter follows the crystal. On a result, Space / Enter = Next round.
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
import { BATCH_SIZE, LEAD_MS, RESULT_AUTO_MS } from "../config.ts";
import { dialFor, type RoundResult, type Valve } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { actOf, displayedStability, nextWave, roundMs, useSolo } from "./soloStore.ts";

export function Batch() {
  const s = useSolo((st) => st);
  const { round, phase, plan, crewPlan, tuning, advance, timeout, answer, measure, followCrystal } = s;
  const act = actOf(phase);
  const batchNo = nextWave(s); // storm waves count on across Acts II and III

  // Round loop: lead-in → light → (answer | timeout) → result → next light … → readout (Act I: → the storm).
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
      } else if (k === "a" || k === "arrowleft") answer(ANTICLOCKWISE, Date.now());
      else if (k === "c" || k === "arrowright") answer(CLOCKWISE, Date.now());
      else if (act === 3 && next && round?.crystal == null) {
        e.preventDefault();
        measure(Date.now());
      } else if (act === 3 && k === "enter") {
        e.preventDefault();
        followCrystal(Date.now());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, round, answer, measure, followCrystal, advance]);

  const live = round && !round.result;
  // The tag on a pump button: the plan's direction (Act II) or the crystal's suggestion (Act III).
  const suggested: Valve | null =
    act === 1
      ? null // Act I: no plan, no crystal; both readings are on the radio
      : act === 2
        ? round
          ? round.x === 0
            ? plan.onGreen
            : plan.onRed
          : null
        : (round?.crystal ?? null);
  const tag = act === 2 ? S.batch.planTag : S.batch.crystalTag;
  const pumps = (
    <div className="pumps">
      {[ANTICLOCKWISE, CLOCKWISE].map((v) => (
        <button
          key={v}
          className={`btn pumpbtn ${act === 3 && suggested === v ? "pumpbtn--suggested" : ""}`}
          onPointerDown={() => answer(v, Date.now())}
          onClick={() => answer(v, Date.now())}
        >
          <span className="pumpbtn__icon">
            <PumpIcon pump={v} />
          </span>
          {S.pump[v]}
          {suggested === v && <span className="pumpbtn__plan">{tag}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <ScreenLayout
      className={`batch batch--act${act}`}
      actionsUnder="main"
      // Landscape only: the ring, idle while the round is live (it must not show the crewmate's sensor), then the result.
      side={<RingDiagram result={round?.result ?? undefined} idle={!round?.result} />}
      header={
        <div className="meter__head">
          <span className="kicker">{act === 1 ? S.act1.label : S.batch.label(batchNo)}</span>
          <span className="kicker">{round ? (act === 1 ? S.act1.round(round.n) : S.batch.round(round.n, BATCH_SIZE)) : ""}</span>
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
          (act !== 3 || round.crystal !== null ? (
            pumps
          ) : (
            <button className="btn measure" onPointerDown={() => measure(Date.now())} onClick={() => measure(Date.now())}>
              {S.batch.measure}
            </button>
          ))
        )
      }
    >
      <StabilityMeter value={displayedStability(s)} label={S.readout.stability} showCeiling={act === 3} showLimit={act === 3} />
      <Countdown id={round ? round.n : "lead"} ms={round ? roundMs(act) : LEAD_MS} paused={!live} />
      {/* Act I: the radio works, so CORA calls her reading. Later acts: comms dark. */}
      {act === 1 ? <CrewRadio /> : <CommsDark />}
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
          {act === 1 && <p className="muted small act1-rule">{S.act1.ruleLine}</p>}
          {/* Act III: the sensor and the dial it selects, side by side. */}
          <div className={act === 3 ? "round-reading" : "stack"}>
            <SensorLight light={round.x} label={S.batch.yourLight} />
            {act === 3 && <Dial value={dialFor(tuning, round.x)} small />}
          </div>
          {act === 3 &&
            (round.crystal === null ? (
              <p className="muted crystal-hint">{S.batch.measureHint}</p>
            ) : (
              <div className="crystal-says" role="status">
                <strong>{S.batch.crystalSays(S.pump[round.crystal])}</strong>
                <span className="muted small crystal-keys">{S.batch.follow}</span>
              </div>
            ))}
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
