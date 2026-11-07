// A phone in event mode: join a room at a table, then show only what the round needs (own sensor, pump
// buttons or MEASURE with the dial in use, countdown). Everything else is on the TV.
// Act I (the night shift): the radio works, so the phone also shows the partner's reading and pump, and the pump can
// change until the round ends. The storm breaks the radio up mid-line.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AiBadge } from "../components/AiBadge.tsx";
import { Countdown } from "../components/Countdown.tsx";
import { playSfx } from "../audio/sfx.ts";
import { CrewIcon } from "../components/CrewIcon.tsx";
import { Crystals } from "../components/EntanglementSurface.tsx";
import { Dial, formatDeg } from "../components/Dial.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { PhoneMenu } from "../components/PhoneMenu.tsx";
import { MuteToggle } from "../components/MuteToggle.tsx";
import { QuantumBackdrop } from "../components/QuantumBackdrop.tsx";
import { SensorLight } from "../components/SensorLight.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { RadioLine } from "../components/RadioLine.tsx";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { PlanBox } from "../components/PlanBox.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { navigate } from "../lib/router.ts";
import { usePlayer } from "../net/playerStore.ts";
import { useRemainingMs } from "../net/useCountdown.ts";
import type { Light, Table, Valve } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT } from "../shared/fiction.ts";
import { decisionMs } from "../shared/pace.ts";
import { planId } from "../shared/plans.ts";
import { NAME_MAX, ROOM_CODE, type PairInfo, type PartnerCall, type Seat as RoomSeat } from "../shared/protocol.ts";
import { pairReport } from "../shared/report.ts";
import { pct } from "../components/StabilityMeter.tsx";
import { S } from "../strings.ts";

export function Play() {
  const p = usePlayer();
  const [tried, setTried] = useState(false);

  // After a reload, rejoin the seat this tab had.
  useEffect(() => {
    if (!tried) {
      setTried(true);
      if (!p.seat) p.resume();
    }
  }, [tried, p]);

  if (!p.seat) return <JoinForm error={p.error} />;
  if (!p.state || !p.playerId) {
    return (
      <main className="screen screen--center">
        <p className="muted">{p.status === "closed" ? S.event.reconnecting : S.event.connecting}</p>
      </main>
    );
  }
  return <InRoom />;
}

function JoinForm({ error }: { error: string | null }) {
  const join = usePlayer((s) => s.join);
  const params = new URLSearchParams(location.search);
  const [room, setRoom] = useState((params.get("room") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [table, setTable] = useState<Table | null>(null);
  const valid = ROOM_CODE.test(room) && name.trim().length > 0 && table !== null;

  return (
    <main className="screen">
      <p className="kicker">{S.title}</p>
      <h1>{S.phone.title}</h1>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) join({ room, name: name.trim(), table: table! });
        }}
      >
        <label className="field">
          <span className="kicker">{S.phone.code}</span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            placeholder="ABCD"
            className="input input--code"
          />
        </label>
        <label className="field">
          <span className="kicker">{S.phone.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            autoComplete="nickname"
            className="input"
          />
        </label>
        <div className="field">
          <span className="kicker">{S.phone.pickTable}</span>
          <div className="row" role="radiogroup">
            {(["A", "B"] as const).map((t) => (
              <button
                type="button"
                key={t}
                role="radio"
                aria-checked={table === t}
                className={`btn table-pick ${table === t ? "btn--selected" : ""}`}
                onClick={() => setTable(t)}
              >
                {S.event.table(t)}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="tv__error">{error}</p>}
        <button className="btn btn--primary" disabled={!valid}>
          {S.phone.join}
        </button>
      </form>
      <div className="spacer" />
      <button className="btn btn--ghost" onClick={() => navigate("/")}>
        {S.credits.back}
      </button>
    </main>
  );
}

function InRoom() {
  const p = usePlayer();
  const { state, seat, playerId, round, flash, plan, tuning, status, localDeadline, answer, measure, followCrystal, setPlan, setTuning, leave } =
    p;
  const left = useRemainingMs(localDeadline);

  // Keyboard: A / ← = ANTICLOCKWISE, C / → = CLOCKWISE. Act III: Space / Enter = MEASURE, then Enter follows the
  // crystal (A / C go your own way).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") answer(ANTICLOCKWISE);
      if (k === "c" || k === "arrowright") answer(CLOCKWISE);
      if (k === " " || k === "enter") {
        const r = usePlayer.getState().round;
        if (r?.act !== 3) return;
        e.preventDefault();
        if (r.crystal === null) measure();
        else if (k === "enter") followCrystal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, measure, followCrystal]);

  // Phone sounds (off by default in a room; see audio/sfx.ts).
  useEffect(() => {
    if (flash?.win) playSfx("win", "phone");
  }, [flash]);
  const phase = state?.phase;
  useEffect(() => {
    if (phase === "tool") playSfx("reveal", "phone");
  }, [phase]);

  if (!state || !seat) return null;

  const me = state.players.find((pl) => pl.id === playerId);
  const pair = state.pairs.find((pr) => pr.id === me?.pairId);
  const partner = pair ? (seat.table === "A" ? pair.b : pair.a) : null;
  const mine = seat.table === "A" ? "a" : "b";
  // The partner is a player who's away: CORA covers their seat until they rejoin.
  const partnerAway = !!partner?.playerId && !state.players.find((pl) => pl.id === partner.playerId)?.connected;
  const S_ = S.phone.status;
  const status_ = round
    ? null
    : // The lull and the tool reveal already say what to do (and need the room on a small phone).
      state.phase === "strategy" || state.phase === "tool"
      ? null
      : state.phase === "roundResult" || (state.phase === "round" && flash)
        ? state.auto
          ? S_.autoResult
          : S_.manualResult
        : state.phase === "lobby"
          ? null
          : S_.watch;
  const theirs = mine === "a" ? "b" : "a";
  // Act II: the plans locked for this wave (the reminder and the plan tag), and the partner's choice in the lull.
  const locked = pair?.locked ?? null;
  const otherTable = seat.table === "A" ? "B" : "A";
  const quantum = state.act === 3 && state.phase !== "debrief";
  const wrap = (children: ReactNode) => (
    <div className={quantum ? "quantum" : undefined}>
      {quantum && <QuantumBackdrop />}
      {children}
    </div>
  );

  // During a live round the phone shows only the light, the control and the countdown (Act I: and the radio, and the
  // pump stays changeable until the round ends).
  if (round && (round.act === 1 || round.answered === null)) {
    return wrap(
      <main className="screen">
        {/* The countdown follows the room's deadline, so switching to manual (none) or auto, or a new speed, shows at
            once. */}
        {state.phase === "round" && state.deadline !== null && (
          <Countdown
            id={`${round.roundId}-${state.deadline}`}
            ms={decisionMs(state.speed, round.act)}
            left={state.deadline - state.serverNow}
            paused={round.measuring}
          />
        )}
        <SensorLight light={round.light} label={S.batch.yourLight} />
        {round.act === 1 && round.partner && partner && <PartnerRadio seat={partner} call={round.partner} />}
        {round.act === 2 && locked && partner && (
          <p className="agreed">{S.event.agreed(locked[mine], partner.name, locked[theirs])}</p>
        )}
        {round.act === 3 && round.dialDeg !== null && <Dial value={round.dialDeg} small />}
        {round.act === 3 &&
          (round.crystal === null ? (
            <p className="muted crystal-hint">{S.batch.measureHint}</p>
          ) : (
            <div className="crystal-says" role="status">
              <strong>{S.batch.crystalSays(S.pump[round.crystal])}</strong>
              <span className="muted small crystal-keys">{S.batch.follow}</span>
            </div>
          ))}
        <div className="spacer" />
        {round.act === 3 && round.crystal === null ? (
          <button className="btn measure" disabled={round.measuring} onPointerDown={measure} onClick={measure}>
            {S.batch.measure}
          </button>
        ) : (
          <div className="stack">
            {round.act === 1 && <p className="muted small act1-rule">{S.phone.act1Change}</p>}
            <div className="pumps">
              {[ANTICLOCKWISE, CLOCKWISE].map((v) => {
                // The tag: the plan's direction (Act II) or the crystal's suggestion (Act III).
                const tagged =
                  round.act === 2
                    ? plannedPump(locked?.[mine] ?? plan, round.light) === v
                    : round.act === 3 && round.crystal === v;
                return (
                  <button
                    key={v}
                    className={`btn pumpbtn ${round.act === 1 && round.answered === v ? "btn--selected" : ""} ${round.act === 3 && tagged ? "pumpbtn--suggested" : ""}`}
                    aria-pressed={round.act === 1 ? round.answered === v : undefined}
                    onPointerDown={() => answer(v)}
                    onClick={() => answer(v)}
                  >
                    <span className="pumpbtn__icon">
                      <PumpIcon pump={v} />
                    </span>
                    {S.pump[v]}
                    {tagged && <span className="pumpbtn__plan">{round.act === 2 ? S.batch.planTag : S.batch.crystalTag}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>,
    );
  }

  // Act III: the partner's dials, live (read-only).
  const partnerDials = pair && partner && (
    <p className="partner-plan" role="status">
      <span className="kicker">
        {S.event.partnerDials(partner.name)}
        {partner.playerId === null && <AiBadge />}
      </span>{" "}
      <strong>{S.event.dialsLine(formatDeg(pair.dials[theirs].greenDeg), formatDeg(pair.dials[theirs].redDeg))}</strong>
    </p>
  );

  const tuningPanel = (
    <div className="row panel">
      <Dial value={tuning.greenDeg} onChange={(d) => setTuning({ ...tuning, greenDeg: d })} label={<SensorLight light={COOL} small />} />
      <Dial value={tuning.redDeg} onChange={(d) => setTuning({ ...tuning, redDeg: d })} label={<SensorLight light={HOT} small />} />
    </div>
  );

  return wrap(
    <main className="screen">
      <div className="screen-top">
        <span className="dial__label">
          <CrewIcon table={seat.table} />
          <span className="kicker">{S.phone.seat(seat.table, seat.name)}</span>
        </span>
        {status !== "open" && <span className="kicker">{S.event.reconnecting}</span>}
        <span className="row phone-top__tools">
          <MuteToggle where="phone" />
          <PhoneMenu
            partner={partner && { name: partner.name, cora: partner.playerId === null }}
            onLeave={() => {
              leave();
              navigate("/");
            }}
          />
        </span>
      </div>
      {partner && (
        <p className="muted">
          {partnerAway ? S.phone.partnerCovered(partner.name, otherTable) : S.phone.partner(partner.name, otherTable)}
          {(partner.playerId === null || partnerAway) && <AiBadge />}
        </p>
      )}

      {round && round.answered !== null && (
        <div className="result spacer">
          <p className="result__verdict">{S.phone.pumpSet(S.pump[round.answered])}</p>
          {/* Whether the partner has chosen yet (never what they chose). */}
          {pair && partner && (
            <p className="muted" role="status">
              {pair.answered[theirs] ? S.phone.partnerChosen(partner.name) : S.phone.waitingFor(partner.name)}
            </p>
          )}
        </div>
      )}

      {!round && flash && (state.phase === "roundResult" || state.phase === "round") && (
        <div className={`result spacer ${flash.win ? "result--win" : "result--loss"}`} role="status">
          <div className="result__verdict">
            {flash.win ? "✓ " : "✗ "}
            {/* What happened, as in solo. */}
            {S.outcome[flash.cause].title}
          </div>
          {partner && (
            <>
              <p className="telemetry">
                <span className="telemetry__head">{S.telemetry.head}</span> {S.event.why(flash, mine, partner.name)}
              </p>
              <div className="result__ring">
                <RingDiagram result={flash} small labels={ringLabels(seat.table, partner.name)} />
              </div>
            </>
          )}
        </div>
      )}

      {!round && state.phase === "briefing" && (
        <div className="stack spacer">
          <h2>{S.phone.briefing}</h2>
          <p>{S.phone.briefingBody}</p>
          <RuleChip />
        </div>
      )}

      {!round && state.phase === "storm" && (
        <div className="stack spacer">
          {partner?.playerId === null ? (
            <RadioLine lines={[S.crew.stormBreak]} interference />
          ) : (
            <RadioLine who={S.event.storm.log} quoted={false} lines={[S.event.storm.logBreak]} interference />
          )}
        </div>
      )}

      {/* The supply pod: engineering's note, then (the first time) how the tool behaves, named for the partner. The
          dials come in the lull that follows. */}
      {!round && state.phase === "tool" && (
        <div className="stack reveal reveal--phone">
          <Crystals />
          <h2 className="reveal__title">{S.event.pod.title}</h2>
          <p>{S.event.pod.lines[1]}</p>
          {partner && (
            <div className="panel how-tool">
              <p className="kicker">{S.event.tuning.head}</p>
              <p>{S.event.tuning.explain(partner.name)}</p>
            </div>
          )}
        </div>
      )}

      {!round && state.phase === "strategy" && (
        <div className="stack lull">
          <div className="lull__head">
            <h2>{S.phone.huddle}</h2>
            {left !== null && <div className="tv__clock">{Math.ceil(left / 1000)}</div>}
          </div>
          <p>{state.act === 2 ? S.phone.huddleBody : S.phone.huddleBody3}</p>
          <RuleChip />
          {state.act === 2 ? (
            <>
              <PlanBox title={S.phone.plan} label={S.phone.plan} value={plan} onChange={setPlan} className="plan-box--phone" />
              {pair && partner && (
                <p className="partner-plan" role="status">
                  <span className="kicker">
                    {S.event.partnerPlan(partner.name)}
                    {partner.playerId === null && <AiBadge />}
                  </span>{" "}
                  <strong>{S.plans.name[planId(pair.plans[theirs])]}</strong>
                </p>
              )}
            </>
          ) : (
            <>
              {tuningPanel}
              <div className="partner-row">
                {partnerDials}
                {partner && <HowTool partner={partner.name} />}
              </div>
            </>
          )}
        </div>
      )}

      {!round && !me?.pairId && state.phase !== "lobby" && <p className="muted">{S.phone.waitingSeat}</p>}
      {!round && state.phase === "lobby" && <p className="spacer">{S.phone.lobby}</p>}
      {/* The engineering report: CORA's own line, or (a human partner) a prompt to talk about it. */}
      {!round && state.phase === "ceiling" && partner && (
        <PartnerBeat partner={partner} cora={S.crew.ceiling} head={S.event.beats.head} prompt={S.event.beats.ceiling(partner.name)} />
      )}
      {/* The storm passes: the radio is back. CORA speaks her own line; a human pair is prompted to talk. */}
      {!round && state.phase === "resolution" && partner && (
        <PartnerBeat
          partner={partner}
          cora={state.stationSaved ? S.crew.resolution : S.crew.resolutionNotSaved}
          head={S.event.resolution.head}
          prompt={S.event.resolution.prompt(partner.name)}
        />
      )}
      {/* The incident report: this pair's own numbers to take away. */}
      {!round && state.phase === "debrief" && pair && partner && <PairNumbers pair={pair} partner={partner.name} />}

      {!round && state.phase === "batchDone" && state.act === 3 && (
        <details className="panel">
          <summary className="kicker">{S.phone.retune}</summary>
          {tuningPanel}
        </details>
      )}

      <div className="spacer" />
      {/* Where the Leave button used to be: what's happening, while there's nothing to press. */}
      {status_ && (
        <p className="phone-status" role="status">
          {status_}
        </p>
      )}
    </main>,
  );
}

/** One of CORA's personal beats: her own line on the radio when she's the partner; otherwise a prompt to the pair. */
function PartnerBeat({ partner, cora, head, prompt }: { partner: RoomSeat; cora: string; head: string; prompt: string }) {
  if (partner.playerId === null) return <RadioLine lines={[cora]} />;
  return (
    <div className="panel stack partner-beat" role="status">
      <p className="kicker">{head}</p>
      <p>{prompt}</p>
    </div>
  );
}

/** The incident report on a phone: the pair's Act I score, their locked plans' true rate and their dials' exact rate
 *  (a dash for any act they didn't play). */
function PairNumbers({ pair, partner }: { pair: PairInfo; partner: string }) {
  const r = pairReport(pair);
  const R = S.event.report;
  const cell = (label: string, value: number | null, note: string) => (
    <li>
      <span className="kicker">{label}</span>
      <b className="three__big">{value === null ? "—" : pct(value)}</b>
      <span className="muted small">{value === null ? R.notPlayed : note}</span>
    </li>
  );
  return (
    <div className="panel stack pair-numbers">
      <p className="kicker">{R.phoneHead(partner)}</p>
      <ul className="three">
        {cell(R.phoneAct1, r.act1, R.phoneAct1Note)}
        {cell(R.phoneAct2, r.plan, R.phoneAct2Note)}
        {cell(R.phoneAct3, r.dials, R.phoneAct3Note)}
      </ul>
    </div>
  );
}

/** After the tool reveal, "How the tool works" sits behind a button (a Sheet), named for the partner. */
function HowTool({ partner }: { partner: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className="btn btn--ghost how-tool__btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {S.event.tuning.howButton}
      </button>
      <Sheet open={open} onClose={close} label={S.event.tuning.head}>
        <div className="stack">
          <p className="kicker">{S.event.tuning.head}</p>
          <p>{S.event.tuning.explain(partner)}</p>
        </div>
      </Sheet>
    </>
  );
}

/** Act I's radio: CORA calls her own reading and pump; a human partner's are reported by the radio. */
function PartnerRadio({ seat, call }: { seat: RoomSeat; call: PartnerCall }) {
  if (seat.playerId === null)
    return <RadioLine lines={[call.pump === null ? S.crew.readingLight[call.light] : S.crew.reading(call.light, call.pump)]} />;
  const { name } = seat;
  return (
    <RadioLine
      who={name}
      quoted={false}
      lines={[S.event.radio.reads(name, call.light), call.pump === null ? S.event.radio.noPump(name) : S.event.radio.turning(name, call.pump)]}
    />
  );
}

/** The result ring names both sections: this phone's side is "you". Long names are cut so the ring stays readable. */
function ringLabels(mine: Table, partnerName: string) {
  const short = partnerName.length > 8 ? `${partnerName.slice(0, 7)}…` : partnerName;
  const name = (t: Table) => (t === mine ? S.event.you : short);
  return { a: S.event.ringSide("A", name("A")), b: S.event.ringSide("B", name("B")) };
}

const plannedPump = (plan: { onGreen: Valve; onRed: Valve }, light: Light) => (light === COOL ? plan.onGreen : plan.onRed);

