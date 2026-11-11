// A phone in event mode: join a room at a table, then show only what is private to this player: their sensor, their
// plan, their pump and their own pair's result. What the room shares (the story, the rules, every pair's results,
// the crew's stability) is the TV's. The header always names the phase (src/screens/phoneStatus.ts); with nothing
// to do, the body is a calm idle state with no instructions.
// Act I (the night shift): the radio works, so the phone also shows the partner's reading and pump, and the pump can
// change until the round ends. The storm breaks the radio up mid-line.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../components/ActionBar.tsx";
import { AiBadge } from "../components/AiBadge.tsx";
import { Countdown } from "../components/Countdown.tsx";
import { phoneCues } from "../audio/cues.ts";
import { playSfx } from "../audio/sfx.ts";
import { CrewIcon } from "../components/CrewIcon.tsx";
import { Crystals } from "../components/EntanglementSurface.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { PhoneMenu } from "../components/PhoneMenu.tsx";
import { MuteToggle } from "../components/MuteToggle.tsx";
import { QuantumBackdrop } from "../components/QuantumBackdrop.tsx";
import { SensorLight } from "../components/SensorLight.tsx";
import { PumpIcon } from "../components/PumpIcon.tsx";
import { RadioLine } from "../components/RadioLine.tsx";
import { RingDiagram } from "../components/RingDiagram.tsx";
import { PlanBadge } from "../components/PlanBadge.tsx";
import { PlanBox } from "../components/PlanBox.tsx";
import { FourCases } from "../components/FourCases.tsx";
import { CrystalCases } from "../components/CrystalCases.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { Rule } from "../components/Rule.tsx";
import {
  AnswerRow,
  ClueList,
  ClueHint,
  CrystalChain,
  type HumanWithCora,
  CrystalFan,
  CrystalPlanCard,
  CrystalRuleTable,
  planLine,
} from "../components/CrystalPlan.tsx";
import { navigate } from "../lib/router.ts";
import { usePlayer } from "../net/playerStore.ts";
import type { Light, Table, TuningConfig, Valve } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, COOL, HOT } from "../shared/fiction.ts";
import { decisionMs } from "../shared/pace.ts";
import { planId } from "../shared/plans.ts";
import { NAME_MAX, ROOM_CODE, type PairInfo, type PartnerCall, type Seat as RoomSeat } from "../shared/protocol.ts";
import { pairReport } from "../shared/report.ts";
import { pct } from "../components/StabilityMeter.tsx";
import { STATION_NAME, S } from "../strings.ts";
import { phoneStatus } from "./phoneStatus.ts";

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
  const { state, seat, playerId, round, flash, plan, tuning, status, answer, followCrystal, setPlan, setTuning, setReady, leave } = p;

  // Keyboard: A / ← = ANTICLOCKWISE, C / → = CLOCKWISE. Act III: Enter follows the crystal (A / C go your own way).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") answer(ANTICLOCKWISE);
      if (k === "c" || k === "arrowright") answer(CLOCKWISE);
      if (k === "enter") {
        const r = usePlayer.getState().round;
        if (r?.act !== 3) return;
        e.preventDefault();
        followCrystal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, followCrystal]);

  // Phone sounds (off by default in a room): only this player's own action and its consequence (src/audio/cues.ts):
  // the tap of their pump, then their own pair's result. The room's moments (the storm, the tool…) are the TV's.
  const lastFlash = useRef<string | null>(null);
  useEffect(() => {
    for (const cue of phoneCues(lastFlash.current, flash)) playSfx(cue, "phone");
    if (flash) lastFlash.current = flash.roundId;
  }, [flash]);
  const answered = round?.answered ?? null;
  const roundId = round?.roundId ?? null;
  useEffect(() => {
    if (answered !== null) playSfx("tap", "phone");
  }, [answered, roundId]);

  if (!state || !seat) return null;

  const me = state.players.find((pl) => pl.id === playerId);
  const pair = state.pairs.find((pr) => pr.id === me?.pairId);
  const partner = pair ? (seat.table === "A" ? pair.b : pair.a) : null;
  const mine = seat.table === "A" ? "a" : "b";
  // The partner is a player who's away: CORA covers their seat until they rejoin.
  const partnerAway = !!partner?.playerId && !state.players.find((pl) => pl.id === partner.playerId)?.connected;
  const theirs = mine === "a" ? "b" : "a";
  // Act II: the plans locked for this wave (the badge and the plan tag), and the partner's choice in the lull.
  const locked = pair?.locked ?? null;
  const inWave = state.phase === "round" || state.phase === "roundResult";
  const header = (
    <PhoneHeader
      seat={S.phone.seat(seat.table, seat.name)}
      table={seat.table}
      reconnecting={status !== "open"}
      status={phoneStatus(state, {
        seated: !!me?.pairId,
        round: round ? { act: round.act, answered: round.answered !== null } : null,
      })}
      badge={
        state.act === 2 && inWave && locked && partner ? (
          <PlanBadge mine={locked[mine]} partner={partner.name} theirs={locked[theirs]} />
        ) : null
      }
      partner={partner && { name: partner.name, cora: partner.playerId === null }}
      onLeave={() => {
        leave();
        navigate("/");
      }}
    />
  );
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
        {header}
        {/* The countdown follows the room's deadline, so switching to manual (none) or auto, or a new speed, shows at
            once. */}
        {state.phase === "round" && state.deadline !== null && (
          <Countdown
            id={`${round.roundId}-${state.deadline}`}
            ms={decisionMs(state.speed, round.act)}
            left={state.deadline - state.serverNow}
            paused={false}
          />
        )}
        <SensorLight light={round.light} label={round.act === 3 ? S.event.chain.sensor : S.batch.yourLight} />
        {round.act === 1 && round.partner && partner && <PartnerRadio seat={partner} call={round.partner} />}
        {/* Act III: what the station did with the plan: sensor → setting → the crystal's direction. */}
        {round.act === 3 && round.dialDeg !== null && round.crystal !== null && (
          <CrystalChain light={round.light} dialDeg={round.dialDeg} crystal={round.crystal} />
        )}
        <div className="spacer" />
        {(

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

  // Nothing for this player to do or read: the body is the calm idle state (the header already names the phase).
  const showsResult = !!flash && inWave;
  const idle =
    !round &&
    !showsResult &&
    !["briefing", "storm", "tool", "strategy"].includes(state.phase) &&
    !(state.phase === "batchDone" && (state.act === 3 || !!pair?.locked)) &&
    !(["ceiling", "resolution"].includes(state.phase) && partner) &&
    !(state.phase === "debrief" && pair && partner);

  // Act III: the pair's crystal plans (the player's own as set here; the partner's live from the room).
  const partnerPlan = pair ? pair.dials[theirs] : null;
  const planA = mine === "a" ? tuning : partnerPlan;
  const planB = mine === "b" ? tuning : partnerPlan;
  const cora = partner?.playerId === null;
  // Clue 1 (from the first Act III lull): the pair's live hint (from the plans as they are now, the player's own as
  // set here), and each case's chance on the fan. With CORA, the hint names only the player's own setting.
  const livePlans = planA && planB ? { a: planA, b: planB } : null;
  const human: HumanWithCora = cora && me ? { table: seat.table, name: me.name } : null;
  const chances = state.clue >= 1;
  const hint = chances && !!livePlans;
  // Clue 2 (the answer): the player's own row, and a button that fills it in (while the pair is under 80%).
  const answerRow = state.clue >= 2 && (
    <AnswerRow table={seat.table} plans={livePlans} onUse={setTuning} />
  );
  const planCard = (
    <CrystalPlanCard title={S.event.crystalPlan.head} value={tuning} onChange={setTuning} like className="crystal-plan--phone" />
  );
  // From the tool reveal on: the crystals' rule and the clues so far, each in a sheet.
  const act3Chips = (
    <div className="row chips">
      <SheetChip label={S.rule.head} title={S.rule.head}>
        <Rule diagram />
      </SheetChip>
      <SheetChip label={S.event.crystalRule.chip} title={S.event.crystalRule.head}>
        <p className="kicker">{S.event.crystalRule.head}</p>
        <CrystalRuleTable />
      </SheetChip>
      {state.clue > 0 && (
        <SheetChip label={S.event.clues.chip(state.clue)} title={S.event.clues.head} fresh>
          <p className="kicker">{S.event.clues.head}</p>
          <ClueList
            clue={state.clue}
            pairs={pair ? [{ id: pair.id, plans: livePlans, human }] : []}
            table={seat.table}
            onUse={setTuning}
          />
        </SheetChip>
      )}
    </div>
  );

  return wrap(
    <main className="screen">
      {header}
      {/* (The Act III lull names the partner on their crystal plan, so the line steps aside there.) */}
      {partner && !(state.phase === "strategy" && state.act === 3 && !round) && (
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

      {!round && showsResult && (
        <div className={`result spacer ${flash.win ? "result--win" : "result--loss"}`} role="status">
          <div className="result__verdict">
            {flash.win ? "✓ " : "✗ "}
            {/* What happened, as in solo. */}
            {S.outcome[flash.cause].title}
          </div>
          {partner && (
            <>
              <p className="why">{S.event.why(flash, mine, partner.name)}</p>
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

      {/* The supply pod: engineering's note, and what the crystals do to a plan. The crystal plan comes in the lull. */}
      {!round && state.phase === "tool" && (
        <div className="stack reveal reveal--phone">
          <Crystals />
          <h2 className="reveal__title">{S.event.pod.title}</h2>
          <p>{S.event.pod.lines[1]}</p>
          <p>{S.event.pod.lines[2]}</p>
          <p>
            <strong>{S.event.pod.lines[3]}</strong>
          </p>
          {act3Chips}
        </div>
      )}

      {!round && state.phase === "strategy" && (
        <div className={`stack lull ${state.act === 3 ? "lull--act3" : ""} ${state.act === 3 && state.clue >= 2 ? "lull--answer" : ""}`}>
          {/* The header's status names the lull; the heading stays for screen readers (U1). */}
          <h2 className="hide-on-phone">{S.phone.huddle}</h2>
          {state.act === 2 && <p>{S.phone.huddleBody}</p>}
          {state.act === 2 ? <RuleChip /> : act3Chips}
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
              {planCard}
              {partner && partnerPlan && (
                <PartnerCard name={partner.name} cora={cora} plan={partnerPlan} a={planA!} b={planB!} chances={chances} />
              )}
              {hint && <ClueHint plans={livePlans} human={human} />}
              {answerRow}
              {planA && planB && <CrystalFan a={planA} b={planB} chances={chances} />}
            </>
          )}
        </div>
      )}

      {!round && !me?.pairId && state.phase !== "lobby" && <p className="muted">{S.phone.waitingSeat}</p>}
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

      {/* After an Act II wave: the pair's locked plans, case by case (the TV shows them too up to four pairs; from five
          it shows one compact row per pair, so each pair reads its own cases here). */}
      {!round && state.phase === "batchDone" && state.act === 2 && pair?.locked && (
        <div className="panel phone-cases">
          <FourCases plan={pair.locked.a} crewPlan={pair.locked.b} order={S.event.phoneCases.order(pair.a.name, pair.b.name)} />
        </div>
      )}
      {!round && state.phase === "batchDone" && state.act === 3 && (
        <>
          {pair?.lockedDials && (
            <div className="panel phone-cases">
              <CrystalCases
                title={S.event.phoneCases.head}
                tuning={pair.lockedDials.a}
                crew={pair.lockedDials.b}
                order={S.event.phoneCases.order(pair.a.name, pair.b.name)}
                gaps
              />
            </div>
          )}
          {act3Chips}
          {hint && <ClueHint plans={livePlans} human={human} />}
          {answerRow}
          <details className="panel">
            <summary className="kicker">{S.event.crystalPlan.retune}</summary>
            {planCard}
          </details>
        </>
      )}

      {idle && <PhoneIdle phase={phoneStatus(state, { seated: !!me?.pairId, round: null })} />}
      <div className="spacer" />
      {/* The lull (R1): Ready under the plan, sticky at the bottom so it's always in reach; the room holds the flag. */}
      {!round && state.phase === "strategy" && pair && partner && (
        <ReadyBar
          ready={pair.ready[mine]}
          partner={partner.name}
          partnerReady={pair.ready[theirs]}
          onChange={setReady}
        />
      )}
    </main>,
  );
}

/** The phone's header on every screen: the seat, mute and the ⋯ menu, then the phase status (with the plan badge in
 *  an Act II wave). The status is the one place a phone says what's happening; it never points at the TV. */
function PhoneHeader({
  seat,
  table,
  reconnecting,
  status,
  badge,
  partner,
  onLeave,
}: {
  seat: string;
  table: Table;
  reconnecting: boolean;
  status: string;
  badge: ReactNode;
  partner: { name: string; cora: boolean } | null;
  onLeave: () => void;
}) {
  return (
    <header className="phone-head">
      <div className="screen-top">
        <span className="seat-label">
          <CrewIcon table={table} />
          <span className="kicker">{seat}</span>
        </span>
        {reconnecting && <span className="kicker">{S.event.reconnecting}</span>}
        <span className="row phone-top__tools">
          <MuteToggle where="phone" />
          <PhoneMenu partner={partner} onLeave={onLeave} />
        </span>
      </div>
      <div className="phone-head__status">
        <p className="kicker" role="status">
          {status}
        </p>
        {badge}
      </div>
    </header>
  );
}

/** Nothing to do: the station's name and the phase, calm, with no instruction (the header's status is the live
 *  region, so this copy is hidden from screen readers). */
function PhoneIdle({ phase }: { phase: string }) {
  return (
    <div className="phone-idle spacer" aria-hidden="true">
      <p className="phone-idle__station">{STATION_NAME}</p>
      <p className="muted phone-idle__phase">{phase}</p>
    </div>
  );
}

/** The lull's Ready (R1): "Ready", then "Ready ✓ · tap to change" (which takes it back), with the partner's state
 *  above it. The plan above stays editable; changing it makes the room clear this player's readiness. */
function ReadyBar({
  ready,
  partner,
  partnerReady,
  onChange,
}: {
  ready: boolean;
  partner: string;
  partnerReady: boolean;
  onChange: (ready: boolean) => void;
}) {
  const R = S.event.ready;
  return (
    <ActionBar>
      {/* One row: the partner's state beside the button, so the bar stays short on small phones. */}
      <div className="ready-row">
        <p className={`ready-partner small ${partnerReady ? "ready-partner--on" : "muted"}`} role="status">
          {partnerReady ? R.partnerReady(partner) : R.partnerPlanning(partner)}
        </p>
        <button
          type="button"
          className={`btn ready-btn ${ready ? "ready-btn--on" : "btn--primary"}`}
          aria-pressed={ready}
          onClick={() => onChange(!ready)}
        >
          {ready ? R.buttonOn : R.button}
        </button>
      </div>
    </ActionBar>
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

/** The partner's crystal plan in one line (live, read-only); "See both" opens both cards and the fan in a sheet. */
function PartnerCard({
  name,
  cora,
  plan,
  a,
  b,
  chances,
}: {
  name: string;
  cora: boolean;
  plan: TuningConfig;
  a: TuningConfig;
  b: TuningConfig;
  chances: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="partner-row">
      <p className="partner-plan" role="status">
        <span className="kicker">
          {S.event.crystalPlan.partnerHead(name)}
          {cora && <AiBadge />}
        </span>{" "}
        <strong>{planLine(plan)}</strong>
        {cora && <span className="muted small"> · {S.event.crystalPlan.coraSet}</span>}
      </p>
      <button className="btn btn--ghost how-tool__btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {S.event.crystalPlan.seeCard}
      </button>
      <Sheet open={open} onClose={close} label={S.event.crystalPlan.partnerHead(name)}>
        <div className="stack">
          <CrystalPlanCard
            title={S.event.crystalPlan.partnerHead(name)}
            value={plan}
            cora={cora}
            note={cora ? S.event.crystalPlan.coraSet : undefined}
          />
          <CrystalFan a={a} b={b} chances={chances} />
        </div>
      </Sheet>
    </div>
  );
}

/** A small button that opens a sheet (the station rule, the crystals' rule, the clues). `fresh` marks a new clue. */
function SheetChip({ label, title, fresh = false, children }: { label: string; title: string; fresh?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className={`btn btn--ghost chip ${fresh ? "chip--fresh" : ""}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Sheet open={open} onClose={close} label={title}>
        <div className="stack">{children}</div>
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

