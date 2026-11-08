# Quantum Crew

Working notes for Claude. Read this before working on the game and keep it updated (layout, decisions, status).
This repo is a Playable Stories example of a game built with an AI coding agent.

## Workflow
- One branch + PR per feature or milestone; the user reviews before merge. Never push to `main` directly.
- Before a PR: `pnpm typecheck && pnpm test && pnpm build` (and `pnpm smoke && pnpm session` when touching event
  mode, plus `pnpm shots --event` before/after for the event screens touched). CI
  (`.github/workflows/ci.yml`) runs all of these on every PR and push to `main`.
- All copy goes in `src/strings.ts`; game tuning in `src/config.ts`.

## Atlas API (Moth Quantum) rules
Only `scripts/gen-assets.ts` calls the API, through the vendored client in `packages/atlas-client`
(`submitJob`, `getStatus`, `waitForJob`, `getResult`, `run`, `uploadAsset`, `downloadOutputs`, `saveRun`, `loadEnv`).
- Docs: https://docs.mothquantum.com/docs/intro · engines: https://docs.mothquantum.com/docs/engines/<engine-id> ·
  spec: https://api.mothquantum.com/openapi.json (pinned: `packages/atlas-client/openapi.json`; refresh with
  `pnpm --filter @moth-hack/atlas-client gen:types`).
- **Never invent endpoints, params or result fields.** Check the pinned spec or the engine's docs page; type inline
  `result` shapes from the engine docs and cite them. If unclear, ask.
- **API key only from env** (`MOTH_API_KEY` in `.env`, see `.env.example`). Never log, print, hard-code or commit it,
  and never pass it to browser code (a live browser feature would need a server-side proxy).
- Jobs cost credits: cache results (`output/` is gitignored), reuse them, default to `mode: "emu"`, and don't
  re-submit except on 429/503 (the client handles those).
- Learning mode: a file that uses an engine starts with a 2–6 line plain-language comment on the quantum idea.

## Notes
- **Origin:** Moth Hack 2026, 11 FQxI Challenge (Guest): an educational app teaching a general audience about quantum, ≥ 1 Atlas engine.
- **Goal:** a Spaceteam-style co-op party game (two tables, phones + a shared TV) plus a solo mode for judges. Players
  feel the 75% classical ceiling of the CHSH game, then beat it (≈ 85.4%) with a shared "Entanglement Tool".
  Physics words appear only in the debrief.
- **Fiction (2026-10-16, coolant ring):** coolant runs round a ring through both sections; each table runs its
  section's pump CLOCKWISE or ANTICLOCKWISE; sensors read COOL or HOT (random reactor flares); a relief vent between
  the sections unlocks only when BOTH are HOT. Outcomes: both COOL + agree = Circulating, one HOT + agree = Heat
  carried off, both HOT + fight = Purge (wins); pumps fight with the vent locked = Pressure spike, both HOT + agree =
  Overheat (losses). 80% = "the core can take one bad round in five"; 75% = "the best plan loses one in four".
  **The code keeps the maths names:** `GREEN/RED/OPEN/CLOSED`, `Valve`, `onGreen/onRed`, `greenDeg/redDeg`,
  `partnerGreen/partnerRed`, `player:valve`. `src/shared/fiction.ts` aliases them (COOL = GREEN = 0, HOT = RED = 1,
  CLOCKWISE = OPEN = 0, ANTICLOCKWISE = CLOSED = 1) and has `roundCause()`; UI code uses the aliases. Never rename in
  `chsh.ts`, protocol or tests for the story's sake. Lights are blue/orange with snowflake/flame icons (`--cool` /
  `--hot` tokens), never colour alone; win/loss keeps green/red. Solo results name the cause; so do event results (the
  server sends the round and its `cause`). `RingDiagram` sits in the rule on the solo intro
  and plan screens. Keys: A / ← = ANTICLOCKWISE (left button), C / → = CLOCKWISE.
- **Solo crewmate (2026-10-16):** the player sets the whole Act II joint plan: their own `plan` and the store's
  `crewPlan` (default `DEFAULT_CREW_PLAN`, always clockwise), chosen by name from `src/solo/plans.ts` (the four
  `CLASSICAL_STRATEGIES`, same order). When an Act II batch ends, the locked pair goes on the 4×4 **plan board** at
  its exact rate (`board`, `by: "player"` = tried); `reportCeiling` fills every untried pair exactly
  (`by: "engineering"`, count in `engineeringRan`). Act II never samples: `runSimulation` is Act III only. **Comms rule:** the crewmate speaks only while comms are open
  (huddle, readout, ceiling, tool reveal, tuning). Every line is picked in `src/solo/crew.ts` `crewLines()`, which
  returns nothing in `act2Batch` / `act3Batch`; screens render it through `CrewRadio` → `RadioLine`. Batches show
  `CommsDark` and per-round **station telemetry** (`S.telemetry.line`), never crewmate text (`crew.test.ts`,
  `comms.test.tsx` enforce this). The store only records `crewCue`; readout reactions are derived from the batch.
  The crewmate is **CORA** (Coolant Ring Assistant, "she"): `CREW_NAME` in `strings.ts`, shown with `AiBadge`
  (`components/AiBadge.tsx`: `CrewName`, `SeatName`) on the radio, the huddle, tuning and the round result. Event
  mode's bot seats use the same name (`server/room.ts` `BOT_NAME = CREW_NAME`) and the badge on the TV pair card and
  the phone's partner line. Readout reactions state only facts (`hotCool`, `coolHot`, `bothCool`), never who
  reversed or whose fault it was. Act III
  tuning shows the crewmate's dials locked at `OPTIMAL_TUNING.B`. Event mode's bots: empty seats play
  `BOT_ACT2_PLAN` in Act II, a random pump in Act I, and follow their crystal in Act III. The TV's engineering report
  uses `S.ceiling.engineering` + `S.ceiling.truth` (since E2a); `S.ceiling.lead` / `lines` are no longer shown
  anywhere (only `board.test.tsx` still checks `lines`).
- **Engines used:** Atlas assets made by William on platform.mothquantum.com (tessa-image-v1 station art, blur-v1
  degradation levels, entanglement-shader-v1 tool reveal, a sound engine for sfx). The in-game entanglement is a
  classical simulation of |Φ+⟩ in `src/shared/chsh.ts`; say so honestly in the README and credits.
- **Layout:** `src/shared/` is pure logic shared by client, server, tests and scripts (`rng.ts` mulberry32,
  `chsh.ts`). `src/config.ts` holds the game tuning (timers, batch size, bot plan, unlock thresholds). All copy is in
  `src/strings.ts` (physics words only under `debrief`). Solo = `src/solo/` (`soloStore.ts` is a zustand vanilla
  store; actions take `now` so tests drive the clock; `Batch.tsx` owns the timers). Router = `lib/router.ts`
  (pathname + history, no library). Colours etc. in `tokens.css`; Act III screens use the `.quantum` theme.
  `tsconfig.json` = Node side, `tsconfig.app.json` = browser.
- **Event mode (M3):** `src/shared/protocol.ts` = message types + `parseClientMsg`. `server/room.ts` = one
  authoritative room (pairing, rounds, timers, scoring; deps injected → `server/room.test.ts` drives it with a fake
  clock). `server/station.ts` = rooms by code + conn routing. `server/attach.ts` puts the WS on any http server
  (used by `server/index.ts` in prod and by the Vite plugin in dev, so `pnpm dev` runs everything).
  Client: `net/socket.ts` (auto-reconnect, `hello` re-identifies), `net/hostStore.ts`, `net/playerStore.ts`
  (sessionStorage keeps the seat across reloads), `screens/Screen.tsx` (TV), `screens/Play.tsx` (phone).
  `pnpm start` = `node server/index.ts` (Node type stripping, no tsx). `pnpm smoke` = real-WS end-to-end check.
- **Atlas assets:** drop files into `src/assets/atlas/` named by key (any extension); `manifest.ts` resolves them via
  `import.meta.glob` and placeholders vanish. The list + `params` for credits live in `list.ts` (plain data, also
  read by `pnpm assets`, the checklist). `.gitignore` ignores *.mp4/*.wav: use png/webp/webm/mp3.
  Swap verified 2026-10-05 with temporary SVGs (station-base, crew-icons sprite halves, entanglement-reveal).
- **Entanglement Shader (live):** engine output (job `entanglement-shader-v1-a08def9e`, LUTs 60×60) is committed in
  `atlas-src/entanglement-shader/`; `pnpm bake-shader` decodes R/T `.hdr` → `src/assets/atlas/entanglement-lut.json`.
  `atlas/entanglementShader.ts` = WebGL2 port of the engine's GLSL (`lutColour` is line-for-line) + scenes (film,
  two synced faceted crystals); display grading = tonemap + saturation lift only. `components/EntanglementSurface.tsx`
  (`Crystals`, film) falls back to CSS when the LUT or WebGL2 is missing. Params in list.ts (frustrated, 3 layers, 8 rays, R 0.3,
  A 0.6, interaction 1; resolution 60 per the LUT size, although 120 was suggested).
- **gen-assets (2026-10-06):** `scripts/gen-assets.ts` (tsx; atlas-client can't be type-stripped) + `scripts/lib/inputs.ts`
  (procedural 64×36 station / 64×32 crew PNGs; `atlas-src/inputs/` is gitignored by the `inputs/` rule, it's
  regenerated each run). Tessa max 64×64 on simulators. Tessa jobs 2e442ee7, 7a263168 (fake_fez) and 0510ac96 (aer)
  all failed with engine_timeout after ~60 s, so Blur levels 0–4 were made from the drawn station
  (`--blur-source drawn`), jobs a2dfaf41 (0), b9bd20ff (1), dd70e7a7 (2), 074738dc (3), 5a991314 (4); ~12 s each.
  Provenance files sit next to each PNG; manifest `assetProvenance()` feeds the credits. Display: pixelated, contain.
- **Sound (M5):** `audio/sfx.ts` plays `sfx-*` files or a Web Audio stand-in; mute per context (solo/tv/phone) in
  localStorage, defaults on/on/off; audio unlocks on the first tap. Triggers: win chime (solo round won, TV when
  ≥ half the pairs held, phone flash), alarm (batch ends < 80%, TV rolling crosses below 80%), reveal (tool).
- **Decisions:** marginals in `simulate` are the fraction of ANTICLOCKWISE pumps (bit 1). In simulation, who measures first is a coin
  flip per round unless `order` is given. Solo: the player always measures first; Act II plan pickers feed the
  1,000-round test (rounds are tapped live); solo pacing (2026-10-06, user request): 5 s rounds, 2.2 s result,
  1 Act II batch before the engineering report; the meter spans 50–100%; the 75 line appears from the ceiling reveal
  and 85.4 in Act III; debrief unlocks at a ≥ 80% 1,000-round test or after 2 Act III batches; hint after 1 Act III
  batch under 80% (both lowered 2026-10-06 at the user's request). No framer-motion yet (CSS animations suffice); sounds and mute toggle are M5.
  Event: facilitator-paced (see "Pacing" below): manual rounds have no timer; auto at Relaxed uses `RELAXED_*`, at
  Brisk the original `MP_ACT1_ROUND_MS` 8 s / `MP_ROUND_MS` 3.5 s (Act III too since E3c; `MP_ACT3_ROUND_MS` is gone). Lulls are untimed (the facilitator
  starts the wave); waves are `MP_WAVE_SIZE` 8 rounds; a round resolves early once every seat answered; joiners
  mid-wave are seated after it; max 4 per table; empty or away seat = CORA. The join address follows E0's order and Phase F's
  ranking. Act III: the room measures every crystal at round start (since E3c); tunings snap to the 8 settings; the tool
  unlocks only after the ceiling reveal; the debrief step (E3a) and the clue level (E3c) are the room's;
  per-seat marginals are sent only in the debrief phase (plus a pooled "whole crew" row).
- **Deploy:** solo = static build on Vercel (PlayableStories team); event mode needs one Node process with WebSockets: a
  venue laptop is the documented default, and the README also documents Docker, Fly.io and Render (docs only; nothing
  is deployed).
- **Event E0 (2026-10-30, a real session):**
  - **Join address:** the server answers `/station-info` (`STATION_INFO_PATH`, `StationInfo` in `protocol.ts`) with
    `PUBLIC_URL` and its LAN IPv4 URLs (`server/joinInfo.ts`; also served by the Vite dev plugin). The TV's
    `pickJoinOrigin` (`src/net/joinOrigin.ts`) picks, in order: `PUBLIC_URL`; the TV's own origin unless it's
    localhost (a hosted container's LAN IP is internal); the first LAN URL; else the TV's origin with
    `S.tv.joinWarning`. `JoinPanel` builds the QR and the printed link from one `url` (`data-join-url`).
  - **`pnpm session`** (`scripts/session.ts`): the whole session in-process with a fake clock; CI runs it after smoke.
  - **`pnpm shots --event`:** a TV and two phones (one pair) against the real station on `vite preview`, with a fixed
    example `/station-info` (192.168.1.20). Two passes: TV 1920×1080 + phones 390×844, TV 1280×720 + phones
    375×667. Output `shots/<out>/event/<size>/`; `--compare b a --event`. Live rounds and results are
    viewport-only and retaken if the screen moved on. Known misfits (reported, not fixed in E0): the phone huddle
    and tool scroll (1.27 / 1.61 and 1.18 / 1.56 screens).
  - **Docs:** README "Run event mode at a venue" (laptop + travel router; Node host; `Dockerfile`; Fly.io example,
    docs only, nothing deployed), `docs/facilitator.md` (pre-flight, run of show, troubleshooting), `docs/playtest.md`.
- **Event E1 (2026-10-30, the night shift and the storm for pairs):**
  - **Flow:** lobby → `briefing` (host `startNightShift`) → Act I rounds (`startBatch` from the briefing; the TV labels
    it `S.tv.startRounds`) → `storm` (automatic after `ACT1_ROUNDS`; `deadline` = end of the static, `STORM_STATIC_MS`,
    then the TV shows the storm log) → the lull (`strategy`) → Act II. `protocol.ts` `Act` is `1 | 2 | 3`. From the
    lobby, `startStrategy` / `startBatch` still jump straight to Act II (smoke relies on it); not from the briefing.
  - **Act I in the room:** each pair's order is `act1Order` (moved to `src/shared/act1.ts`, re-exported by solo) with
    the room RNG. `MP_ACT1_ROUND_MS` 8 s; the last tap counts; `round:partner` tells the partner; the round resolves
    early once every pump is set and none changed for `ACT1_SETTLE_MS`. `round:start` carries `partner` (and the
    phone's own `pump`, for a rejoin). CORA sets a random pump at round start. Act I has its own `act1` rates (pair
    and pooled) and stays out of the rolling gauge, which starts with the first wave. Round ids: `act1-n`, else
    `<wave>-<n>` (`roundIdOf`); `batchNo` counts waves only.
  - **Results:** `RoundOutcome` carries `x, y, a, b, cause` in every act. Act I shows the cause on phones (with a
    small ring, `RingDiagram labels`) and on the TV's pair cards. (Waves showed Stable / Leak until E2a; every act
    shows the cause now.)
  - **Copy:** partner lines take the name (`S.event.radio.*`); CORA keeps `S.crew.reading` / `stormBreak`; a human
    partner's storm line is `S.event.storm.logBreak` from the station log (`RadioLine who` / `quoted`). Event wording
    is storm waves now ("Wave n · round", "The wave has passed", "The lull: last chance to talk", "Use the lull",
    "Start the wave"); `story2.test.tsx` checks the new wording.
  - **Fit:** the phone lull uses `RuleChip`, the clock beside the heading and compact plan rows (`.lull`,
    `.plan-picker`, tighter under 700px tall). The host controls stay one row at 1280 wide. `pnpm shots --event` also
    flags TV regions that are cut off (the TV never scrolls); still cut at 1280×720 and left for E2: the engineering
    report, the tool, debrief steps 1–3. The phone tool screen still scrolls (1.18 / 1.56).
- **Event E2a (2026-10-31, Act II at parity):**
  - `src/solo/plans.ts` moved to `src/shared/plans.ts` (solo re-exports). `PlanBox` (the four named plans as a radio
    group) moved from `solo/Plan.tsx` to `components/PlanBox.tsx`; an event phone's lull has one (`plan-box--phone`).
  - **Room:** `PairInfo.plans` (live; a `player:strategy` now broadcasts), `locked` (frozen at each Act II wave start),
    `lastWave` (the pair's rounds in the current or latest wave); `RoomState.triedPlans` (cell keys, Table A plan ×
    Table B plan). `MP_RESULT_MS` is 3.5 s.
  - **Phones:** the lull shows the partner's choice (`S.event.partnerPlan`); a wave shows `S.event.agreed`; Results
    show the cause, `S.event.why` (telemetry; "too slow" names whose pump) and the ring.
  - **TV:** pair cards show the cause in every act (in place of the mini-meter while it shows; no meter before a
    round); three or four pairs are compact, two to a row (`.pairs--crowded`). Wave done (Act II) is `WaveCases`:
    full width (`.tv--cases` hides the side), each pair's `FourCases` in one row, the total and wave score on one
    line, `S.event.lucky` when the wave beat 80% and the plan can't (above only). The report is `CeilingPanel`:
    big 75%, `S.ceiling.engineering` for the crew, `S.ceiling.truth`, `PlanBoard` with `labels` (`S.event.board`).
  - **Shots:** six crowd players over WebSockets make four pairs; a worst-case check (every pair lucky) after wave
    done. Still cut at 1280×720, for E2b: the tool and debrief steps 1–3.
- **Event E2b (2026-11-01, Act III at parity; MEASURE, the dials and the hint were replaced in E3c):**
  - **Room:** MEASURE reads the crystal (`PairRound.crystal`) and sends `round:measured { crystal }`; the pump is a
    separate `player:valve`, accepted only after MEASURE, and scoring uses it. CORA measures at round start and
    follows. `MP_ACT3_ROUND_MS` 7 s. `PairInfo.dials` (live), `lockedDials` (each Act III wave start), `followed`
    (players only, no timeouts); `RoomState.act3Followed`, `crewDialsRate` (average of the pairs' exact rates for
    their locked dials, set when an Act III wave ends) and `stationSaved` (true once that average is ≥ 80%; it
    latches like solo's `act3Passed`). Marginals still record the pump set.
  - **Phones:** the tool reveal is `S.event.pod` (engineering's note) plus `S.event.tuning.explain(name)`; the dials
    live in the lull, with the partner's (`S.event.partnerDials`) and a **How it works** Sheet. Rounds: MEASURE
    (Space / Enter) → "Crystal says" + both pumps, the suggested one tagged (`pumpbtn--suggested`), Enter follows.
    `playerStore` has `round.crystal` and `followCrystal`. `S.tool` and `S.tv.toolLines` are gone.
  - **TV:** `ToolPanel` shows `S.event.pod`; the meter hides on the tool screen. Act III wave done is `CrystalWave`
    (full width like Act II): the crew line (`S.event.wave3.saved` / `notSaved`, crystal followed), each pair's
    `CrystalCases` (optional `order`), true rate with "80%+ holds" inline and a green border, wave score, followed.
    **Start the night shift** shows only in the lobby, so the controls stay one row with **Show hint**.
  - **Shots:** `--quick` (TV 1280×720 + phones 375×667 only); phones and the crowd measure then follow; pair 1 tunes
    to the best dials in the lull. A failed worst-case check is written into the report and fails the run at the
    end. Still cut at 1280×720: debrief steps 1–3 (not in E2's scope).
  - **Working style (2026-11-01, user request):** phases run in checkpoints of about 10–15 minutes; stop after each
    and report (built, checked, unexpected), and wait for "go".
- **Phase F (2026-11-02, before the playtest):**
  - **Join address ranking:** `server/joinInfo.ts` `rankAddresses` / `addressRank`: 192.168/16, 10/8, 172.16/12,
    anything else; last link-local, 100.64/10 and virtual-looking interface names (`docker`, `br-`, `bridge`, `veth`,
    `vmnet`, `vboxnet`, `utun`, `tun`, `tailscale`, `zt`, `wg`). `StationInfo` is `{ publicUrl, lan: { url, iface }[] }`,
    best first. `pickJoinOrigin(info, here, chosen)` returns `alternatives` at localhost; the lobby's `JoinPanel` shows
    "Not working? Try:" buttons, and the TV remembers the choice (`loadChosenAddress` / `saveChosenAddress`,
    localStorage). `pnpm start` logs every address, the chosen one first.
  - **Debrief fit:** the TV debrief is full width (`.tv--wide` hides the side) with the explanation beside the
    step's numbers (`.tv__debrief-body`); Back / Next sit at the bottom right. Every step fits 1280×720 with four pairs.
  - **Docs:** stale event-mode statements fixed; the README has a Render free-tier section; the facilitator's
    pre-flight has "No deploys on event days".
- **Event E3a (2026-11-02, the ending and the incident report):**
  - **Room:** phase `resolution` (host `stormPasses`, "The storm passes", after at least one Act III wave, outside a
    wave), then `debrief` (the TV labels it "Incident report"; still allowed straight from an Act III wave done).
    `RoomState.debriefStep` (0–3) is the room's, moved by `reportNext` / `reportBack` (`REPORT_STEPS`); it resets on
    entering the debrief. `savedDialsRate` keeps the average that first saved the station.
  - **`src/shared/report.ts`:** `crewReport` (Act I pooled, Act III = `savedDialsRate` when saved else
    `crewDialsRate`, the best pair = highest locked-dials rate if ≥ 80%) and `pairReport` (Act I, locked plan's
    true rate, locked dials' exact rate; null for an act not played).
  - **`components/ReportParts.tsx`:** solo's `ThreeNumbers`, `PlanVsCrystals` and `NoSignalling`, now props-driven;
    solo's `Debrief.tsx` passes its own values (output unchanged), the TV passes the crew's (`S.event.report.three`).
  - **TV:** `ResolutionPanel` (calm or damaged, `clearing`, `S.resolution.log` / `logNotSaved`,
    `S.event.resolution.room`); `TvDebrief` = the incident report (`S.report.kicker`, solo's steps; the best pair's
    dials or the best dials; exact 50% bars + the crew's real line + the per-seat table). The engineering report adds
    `S.event.beats.ceilingRoom`.
  - **Phones:** `PartnerBeat`: CORA's own line on the radio (`S.crew.ceiling`, `resolution` / `resolutionNotSaved`)
    when she's the partner, else a prompt naming the partner (`S.event.beats.ceiling`, `S.event.resolution.prompt`).
    In the report, `PairNumbers` shows the pair's three numbers.
  - **Session:** a saved ending, then a reset and a short not-saved one (untuned dials: exactly 75%).
  - **Shots:** the resolution and every report step; a capture that doesn't appear within 5 s is skipped with a
    warning; host-button clicks time out after 5 s.
- **Pacing (2026-11-05, after the first real playtest):** players read the full-width Leave as "continue", and
  event mode moved too fast to read results or talk.
  - **Room (v2, 2026-11-07, after a second playtest: a pace change wasn't immediate and the row was too big):**
    `auto` (Play) / manual (Pause), `speed` = relaxed / brisk (`Speed`), `autoChosen`. Default: manual for each act's
    first wave (the night shift included), auto after; once the facilitator presses Play / Pause / a speed, the
    choice holds until Reset. Every change is immediate: `startPhaseTimer(fresh)` / `stopPhaseTimer()` (re)start or
    cancel the running round's or result's timer; a speed change keeps the time spent (`MIN_LEFT_MS` 2 s left).
    Manual: no deadline; a round closes when every seat answered (Act I after `ACT1_SETTLE_MS`) or on `next`; a
    result waits for `next`. Commands `auto`, `manual`, `next` (closes a round / moves past a result, both modes),
    `setSpeed` (also plays). `deadline` is set for an auto result too. Times live in `src/shared/pace.ts`
    (`decisionMs`, `resultMs`, `secs`). The old freeze-everything pause is gone (players answer in manual). Lulls are
    untimed (`lullSince`; `STRATEGY_MS` is unused). Waves are `MP_WAVE_SIZE` 8.
  - **Stale commands:** `RoomState.step` (phase:act:wave:round:report step); a `host:command` carrying another step
    gets `stale` and is ignored. The TV's `hostStore.command` and the remote's `remoteStore.command` always send it.
  - **CORA:** acts after `CORA_DELAY_MS` (from the room RNG) in every pace; in Act I her reading comes at once and her
    pump after the delay. She also covers a seated player who's away (`player:leave` or a dropped connection) until
    they rejoin with the same name and table; a rejoin before she moved takes that round back. Covered rounds don't
    count in the away player's followed / marginal rows (`PairRound.covered`).
  - **TV:** the host row shows only `nextSteps(state)` (one Next in a round or result), plus `AutoToggle` (▶ Play /
    ⏸ with the seconds left, and a ▾ speed menu, closed by default, with each speed's seconds) and Reset; Space / → =
    `keyStep`, P = play / pause. Countdowns (TV and phones) follow the room's `deadline` (`Countdown left`), never a
    computed pace. Manual shows `S.tv.auto.manualNote`; pair cards show "Still choosing: …"; the lull shows "Talking
    for m:ss". An away seat reads "CORA for …". Report step 3 has
    no per-seat table any more (it didn't fit); the crew's real line stays.
  - **Phones:** no full-width Leave: `components/PhoneMenu.tsx` ("⋯" beside mute, one Sheet that moves from the menu
    to the confirmation, Stay primary). A status line (`S.phone.status.*`) where Leave was; after setting a pump,
    `partnerChosen` / `waitingFor`; an away partner reads `partnerCovered`. Manual rounds have no countdown.
  - **Scripts:** `pnpm session` plays manual first waves (Next closes a round once, a double Next advances once), an
    auto later wave, and (after the reset) Play / Pause on a waiting result; `pnpm smoke` sets Brisk. `pnpm shots
    --event` presses Next round on manual results and captures the phone menu, the leave dialog, the speed menu and
    the auto countdown.
- **Event E3b (2026-11-07, the facilitator's phone remote):**
  - **Room:** a `remoteKey` (`deps.newId()`, separate from the TV's resume token) goes only to the TV, in
    `host:created`; never in `RoomState`. `remote:pair { room, key }` (routed by code like `host:resume`) adds the
    conn to `remotes` and answers `remote:paired`; a wrong key gets `not-host`. Remotes get everything the TV gets
    (`toHost`: state and `round:results`) and may send any `host:command` except `unpairRemotes` (TV only: a new key,
    every remote gets `not-host` and is dropped). `RoomState.remotes` is the count; `isIdle` and `disconnect` count
    remotes. Several remotes may pair; the step check keeps simultaneous presses to one move.
  - **Shared:** `src/screens/hostSteps.tsx` = `nextSteps`, `keyStep`, `enabledSteps`, `stepLabel`, `AutoToggle` (moved
    out of `Screen.tsx`; the TV's output is unchanged).
  - **Remote (`/host`, `screens/Remote.tsx`, `net/remoteStore.ts`):** room and key from the URL, kept in
    sessionStorage (`qc-remote`) and removed from the address bar; `not-host` / `no-room` = "This remote link has
    expired". `RemotePanel` (props-driven): the big button is `remoteSteps(state)[0]` (`keyStep` first, else the first
    enabled step; the report: Next, Back), the other steps, `AutoToggle` (menu opens downward), `S.remote.talk`
    talking points (`talkingPoints`), the room (aboard, talking clock, still choosing, each pair's cause; never a
    sensor or pump), Reset behind a Sheet. (The TV-only Show hint was replaced by the clue ladder in E3c.)
  - **TV:** **Remote** in the header beside mute (green "Remote ✓" when `remotes > 0`; kept out of the host row so it
    stays one line), a Sheet with `RemotePairing` (QR + link `remoteUrl(join origin, room, key)`, the warning, the
    count, **Unpair remotes**). `hostStore.remoteKey`.
  - **Scripts:** `pnpm session` pairs a remote before the Act II wave, starts it from the remote, and presses Next on
    the remote and the TV together (advances once). `pnpm shots --event` captures the pairing dialog, then the remote
    joins and is in every later shot of all three (`-remote`).
- **Event E3c (2026-11-07, Act III as a crystal plan; event mode only, solo unchanged):** the first playtest read the
  dials as a control and Act III as guessing.
  - **`src/shared/crystalPlan.ts`** (on chsh.ts, which is untouched): `settingGap` (mod 180°, 0–90°), `CRYSTAL_RULE`
    (gaps 0–90° → `matchProbability`), `planCases` (gap, `need` same / differ), `weakestCase`, `coraPlan(table)`
    (= `OPTIMAL_TUNING`), `planRate`, `pairRateFor`, `CLUE_SETTINGS`, `CLUE_COUNT` 4.
  - **Room:** no MEASURE: `player:measure` and `round:measured` are gone. `measurePair` at round start
    (`measureFirst` for A, then `measureSecond` for B at the two planned settings); `round:start` carries the phone's
    own `dialDeg` and `crystal` only. A pump is the only action (changeable until all are set); CORA follows her
    crystal; `followed` as before. `RoomState.clue` (0–4): `unlockTool` sets 1; host `nextClue` raises it one step
    (2 needs an Act III wave; never in a wave; max 4); Reset → 0. `stepSig` includes the clue, so a double Next clue
    rises once. Brisk Act III uses `MP_ROUND_MS`.
  - **Phones (`components/CrystalPlan.tsx`):** `CrystalPlanCard` (two `<select>`s of the 8 settings under one lead
    line; the full sentence is each list's label; read-only without `onChange`), the partner's plan in one line with
    **See both** (a Sheet with their card and `CrystalFan`), `CompareWithPlan` in the lull before the first Act III
    wave (then in the Crystal rule sheet), the starting line (`S.event.crystalPlan.startHumans` while both are at
    0°; `startCora` with the pair's live rate, `rateText` = "75%" / "67.7%"), `CrystalFan` (read-only SVG + four
    gaps), chips (`SheetChip`: Station rule, Crystal rule, Clues (n)) from the tool reveal on, `ClueList`. Rounds:
    the chain (sensor → "your plan" + small `Dial` → "the crystal says"), `LockedPlan` stamps in Acts II and III.
    `.lull--act3` is tighter under 700px tall; every Act III phone screen fits 375×667.
  - **TV:** `Explainer` (now / you can / the question; compact one-paragraph form except on the tool reveal),
    `ToolPanel` with clue 1, `CrystalLull` (the rule full width, then `ClueList titlesInline`), "Plans locked" in the
    wave banner (with the manual note on one line) and 🔒 on pair cards; `CrystalWave` passes `CrystalCases gaps`
    (gap · chance per case) and `weakest` (clue 2, pairs under 80%: `case--weakest`, "weakest: closer / wider"),
    "found it: 80%+", luck lines both ways (`luckyAbove` / `luckyBelow`); the per-pair followed count moved to the
    crew line only. The hint toggle is gone. Report: `S.event.report.steps` / `compare` / `bestPlans`
    (`PlanVsCrystals copy`), the resolution's `S.event.resolution.plans`.
  - **Host steps:** `nextClue` in `nextSteps` (tool, Act III lull, Act III wave done), enabled by `enabledSteps`,
    labelled `S.tv.nextClue(n)`; the remote's `talkingPoints` add `S.remote.talk.clue[clue - 1]` in Act III.
  - **Copy:** event keys never say "dials" / "tuning" (`tvAct3.test.tsx` checks S.event, S.tv, S.remote, S.phone);
    solo's keys are untouched.
  - **Scripts:** `pnpm session`: clue 1 with the tool, a wave at 0° (75%, not saved), the remote releases clues 2–4,
    a wave at `CLUE_SETTINGS` (85.4%, saved), and no `player:measure`. `pnpm shots --event`: the starting lull, picks
    settings from the lists, both sheets, clues 2–4 (TV, phones, remote), a quick final wave, then the ending.
- **Event E3d (2026-11-08, Act III said plainly; event mode only, solo unchanged):** a player-eye review found two
  essentials never said (each crystal alone is a coin flip; followed crystals match exactly when they agree), and
  clue 3 was false ("the match gaps add up to the differ gap"; true: the differ gap ≤ their sum).
  - **Copy rule:** every number in Act III copy is computed (`clueAnswer`, `settingGap`, `RULE_GAPS`,
    `SURVIVAL_THRESHOLD`); `crystalPlan.test.tsx` fails on a `\d%` literal in `S.event.crystalRule` / `clues` / `fan`
    or `S.remote.talk.clue` (now a function of `ClueTalk`, built by `Remote.tsx` `clueTalk()`).
  - **Clue 1** = `CrystalRuleTable`: `coin`, `closer` + the gap table, the computed `fold` note, `follow`. The TV shows
    it on the tool reveal and every Act III lull (the lull's clue panel appears from clue 2); phones in the Crystal
    rule sheet. `clues.question` and `CompareWithPlan` / `S.event.compare` are gone; the card has a `like` line.
  - **Clue 2** = a hint (`clueHint(lockedDials)`: none / found ≥ 80% / hint with `weakestCase`). Phones: `ClueHint`
    replaces the starting line in the lull and shows on wave done; the fan gets `chances` (gap · % same / differ).
    TV: `CrystalWave` outlines the weakest case and adds `tvHint` ("weakest … : move further apart") on the true-rate
    line of a pair below 80% (the old "weakest: wider" tag is gone); the lull lists only those pairs (`listHint`).
    `S.tv.nextClue(2, pairsNotYet)` = "Next clue: a hint (N pairs not yet)".
  - **TV fit:** the tool reveal and the Act III lull are `tv--wide` (the join panel and pair list step aside, as on
    wave done); the tool is pod | rule, the lull from clue 2 is rule | clues. The TV leaves out the 180° note.
  - **Rounds:** the chain adds `S.event.chain.flip`; the round explainer says following is how the plan works.
  - **Scripts:** `pnpm session` wave 1 has one pair at the clue 4 settings (77.6% average), checks the label count
    and each phone's hint / found it. `pnpm shots --event`: pair 1 at 67.5% (Ada 0°/45°, Bo 22.5°/22.5°), the crowd's
    Cy and Di at the clue 4 settings; new capture `act3-lull-clue-2`.
- **Debug jump (2026-11-08, user request; testing):** **D** on the TV opens `DebugJump` (a Sheet in `HostControls`):
  host commands `debugAct2` (Act II lull; clears ceiling, tool and clue) and `debugAct3` (Act III tool reveal, as
  Reveal ceiling + Unlock tool: clue ≥ 1). TV only (a remote gets `not-host`), refused in a wave or the debrief,
  step-checked; never in `nextSteps` / the remote. Works in every build (the user's choice). Played stats are kept.
  **F** on the TV toggles full screen (`src/lib/fullscreen.ts`, the Fullscreen API on the whole page; webkit
  fallback; a refusal is ignored). `S.tv.keys` mentions it.
- **Responsive solo (2026-10-17, Phase 1 of 4):**
  - Every solo screen renders through `components/ScreenLayout.tsx`, which has four slots: `header`, main
    (children), `side` and `actions`.
    - The header row holds the screen's kicker and the `MuteToggle`; there is no floating mute button any more.
    - `actions` render in `ActionBar`, which is `position: sticky; bottom: 0` with the safe-area padding.
  - At `(orientation: landscape) and (min-width: 900px)`, a layout with a `side` becomes a two-column grid
    (main | side, max-width 1100), and the actions sit at the bottom of the side column. With no `side` it stays one
    centred column. Phase 1 passes no `side` anywhere.
  - `Sheet.tsx` is a native `<dialog>` with `showModal()`: a bottom sheet on portrait, a right-hand panel on landscape.
    It traps Tab, closes on Escape or a backdrop tap, and returns focus to whatever opened it.
  - `RuleChip.tsx` is the quick rule plus an "Explain" button that opens `<Rule diagram />` in a Sheet. For now it
    sits under the full rule on the huddle; Phase 2 replaces the full card with it.
  - Batch rounds put the pump buttons and MEASURE in the ActionBar. `.reveal` uses `overflow: clip`, not `hidden`,
    so the sticky bar still works.
  - `pnpm shots` (`scripts/shots.ts`, Playwright, see README) captures every solo screen. For a PR, run
    `--out before` on main and `--out after` on the branch, then `--compare before after`. The contact sheets go to
    the orphan branch `pr-shots` under `phase-N/` and are embedded in the PR body; that branch is never merged.
  - **Phase 2 (2026-10-17, Act II screens):**
    - The intro has two steps in its own component state: the station log and art, then the full rule and the 80%
      line. This is the only place the full rule shows by default.
    - Huddle: `PlanBoard` with `onSelect` is the plan chooser. Each square is a button with roving focus, and
      `moveCell` in `plans.ts` handles the arrow keys. A tap calls `choosePlan` only for the side that changed. A
      pair line uses `S.batch.you` / `S.batch.crewmate`, and the Start button's subtitle is `S.plan.blind`.
    - Readout (both acts): the station is a banner behind the headline, and one test card holds the meter and the
      Run button, plus `S.readout.added` in Act II.
    - Engineering report: `PlanBoard exact` shows `expectedBoard()` rates, with the player's own test small
      underneath and a corner mark (`.board__cell--eng::after`) on engineering's squares. Solo uses
      `S.ceiling.truth`. (The event TV used `S.ceiling.lines` until E2a; it now uses the board and `truth` too.)
    - Phone rules (`max-width: 599px`): 12px gaps and panel padding, and a compact test button. The huddle's h1 is
      visually hidden on phones (`.hide-on-phone`).
    - `pnpm shots` reports heights to 2 decimals and checks picking a board square from the keyboard.
  - **Phase 3 (2026-10-17, Act III and debrief):**
    - Tool reveal: crystals and title in main, the text and radio in the side column.
    - Tuning: the player's dials first, full size.
      - The crewmate's dials are one line (`S.crew.dialsLine`), with **See dials** opening the locked dials in a
        Sheet.
      - The hint opens in a Sheet from the existing button. It still calls `showHint`.
      - The rule chip replaces the full card, and there's no meter.
    - Debrief: each step's numbers panel is the `side` slot. Step 2 is one panel, with `.optimal` putting the two
      tables side by side.
    - `CreditsList` (debrief final step and `/credits`) is short; **How the art was made** opens the asset list in a
      Sheet.
    - Phone debrief type is a size down (`.debrief`). On short landscape screens (≤ 860px tall) MEASURE is
      1.2 × `--tap`.
    - Every solo screen fits one viewport at 1440×900, 1180×820 and 390×844.
  - **Phase 4 (2026-10-17, live ring):**
    - `RingDiagram` has three modes:
      - no props: the rule diagram;
      - `idle`: a live round, which shows no sensor;
      - `result`: the round's result.
    - In `result` mode the halves are coloured by sensor and labelled COOL/HOT, the impellers spin with arrows, the
      vent opens on a double HOT, and each cause has its own mark: flow dashes, a burst where opposing flows meet, puffs
      out of the vent, a glow for overheat, a stopped pump. It is `aria-hidden`, because the telemetry text says the
      same.
    - Motion is pure CSS and the global reduced-motion rule stills it.
    - Batch is `ScreenLayout className="batch" actionsUnder="main"`, with the ring as its `side`. That side shows only
      on landscape (`.batch .layout__side` is hidden when stacked).
    - On stacked screens `RoundOutcome` swaps the You/Crewmate panel for a small ring, using `.only-split` /
      `.only-stacked`.
    - `ring.test.tsx` checks that the ring stays idle through every live round in both acts.
- **CORA Phase 1 (2026-10-29):** CORA and her AI badge, factual copy, and the TV's 75% line matching solo's ("exactly
  75%… any batch above it is luck"). Exact board rates are whole numbers ("75%"). On landscape ≥ 900px wide,
  `html:has(.solo)` scales the root font with `clamp(16px, 0.6vw + 1.2vh, 22px)`; `--gap` / `--tap` and the
  board, dials, rings and banner scale too; main and side sit centred vertically. Short landscape screens
  (≤ 860px tall) shrink the Act III round's dial and MEASURE so it fits. Phones are unchanged.
- **CORA Phase 2 (2026-10-29, Act II flow):**
  - Huddle (`Plan.tsx`): "Last chance to talk". Two dialogue boxes (`PlanBox`, a radio group each, arrow keys) for
    You and CORA; **Lock in the plan** starts the batch. No test, no board.
  - Rounds (`Batch.tsx`): an agreed-plan reminder (`S.batch.agreed`). The result is the cause, one
    `S.telemetry.why` sentence and the ring; there is no You/Crewmate panel. It waits for **Next round** (or
    Space / Enter) and auto-advances after `RESULT_AUTO_MS` (6 s; `RESULT_MS` is gone). This covers both acts.
  - The live and idle ring use a wider viewBox with sensor and pump words beside each side, at 15 units, so no ring
    text renders below 12px. `pnpm shots` fails if any does.
  - `StabilityMeter` (solo and the TV) runs 0–100% with "0%" / "100%" below the ends:
    - ceiling above, ending at its line;
    - limit above, right-aligned to the bar's end, and on phones (≤ 599px) one row higher, since the bar is too
      narrow for both on one row;
    - survival below, ending at its line.
    - `pnpm shots` fails if any gauge labels overlap.
  - Act II readout:
    - `FourCases` (from `chsh.ts` `classicalCases`, exact) behind "If we both follow the plan perfectly"; the meter
      hides while it's open.
    - The luck line uses `luckLine(batchRate, trueRate)`.
    - On phones the two buttons sit side by side.
  - Engineering report: exact board only. "Tried" means played. `playerTried`.
- **CORA Phase 3 (2026-10-29, Act III flow):**
  - Rounds:
    - `measure()` reads both crystals: the player's suggestion is `round.crystal`, CORA's pump is `round.crewPump`.
    - The player then sets the pump with `answer` / `followCrystal`. Scoring uses that pump, and CORA follows her
      crystal.
    - `batchFollowed` records whether the player followed. Act III rounds last `ACT3_ROUND_MS` (7 s).
    - The pump buttons appear only after MEASURE. Space / Enter = MEASURE, then Enter = follow.
  - The gate: `finishBatch` checks `dialsRate` (exact, `quantumExpectedWinRate`).
    - ≥ 80% sets `act3Passed`, which unlocks the debrief; under 80% counts as a failed batch for the hint.
    - The two-batch fallback is unchanged.
  - **Solo never samples:**
    - `runSimulation`, `lastSim`, `bestAct3Sim`, `SIM_ROUNDS` and `DEBRIEF_SIM_ROUNDS` are gone.
    - The readouts show exact four-case views: `FourCases` and `CrystalCases`, from `chsh.ts` `classicalCases` /
      `quantumCases`.
    - `luckGap` covers both directions.
    - The debrief uses `exactOpenRates`, a flat 50%.
  - Tuning: a "How the tool works" note, inline on the first visit and in a Sheet after that. No live rate.
  - Debrief quantum step: `PlanVsCrystals` puts the best plan (75%) beside the dials (yours if they passed, else
    0°/45°).
- **Story Phase 1 (2026-10-30, background, Act I and the storm):**
  - The solo story is set on **Kestrel Station**: `STATION_NAME` in `strings.ts`, a placeholder that may change.
    Always "station", never "ship".
  - The intro has two steps: the background, then "Tonight's routine" (readings over the radio) with the rule.
    `start()` now leads into **Act I** (`act1Batch`).
  - **Act I** (it was milestone M6, now built for solo):
    - `ACT1_ROUNDS = 6` rounds of `ACT1_ROUND_MS = 8000`.
    - The order comes from `act1Order(rng)` (`src/solo/act1.ts`): every sensor combination, at least one both-HOT,
      never both-HOT first.
    - CORA's pump is random per round (`act1Crew`, drawn from the seeded RNG at `start()`, set as `round.crewPump`
      when the round starts). She calls her reading and that direction over the radio ("Hot here! Turning
      anticlockwise.", `crewLines` for `act1Batch`), so the rule (match her unless both are HOT) wins every round.
    - The round reuses `Batch.tsx` with `act === 1`: `CrewRadio` instead of `CommsDark`, a one-line rule reminder, no
      tags.
    - Results are recorded in `act1` for the debrief.
  - **The storm** (`storm` phase, `Storm.tsx`) has two steps in its own state:
    - CORA's line breaks off under static (`RadioLine interference`; the flicker stops with reduced motion);
    - then the station log.
    - `endStorm()` leads to the first huddle.
  - Solo's `Act` type is `1 | 2 | 3`. (Event mode got Act I and the storm in E1; its `protocol.ts` `Act` is
    `1 | 2 | 3` too.)
  - Tests reach the huddle through `toHuddle()` (`src/solo/testkit.ts`), which plays Act I by the rule and leaves the
    storm.
- **Story Phase 2 (2026-10-30, waves and the ending):**
  - In solo copy a batch is a **storm wave**: `S.batch.label`, `S.readout.kicker`, `S.plan.lockSub`,
    `S.tuning.start` and `S.comms`. Waves are counted across Acts II and III (`nextWave` / `lastWave`). The huddle is
    **the lull**.
  - Internal identifiers stay (`batch`, `act2Batch`…).
  - **Solo has its own keys where event mode shares strings:**
    - `S.pod` for the tool reveal (event mode has its own `S.event.pod` since E2b; `S.tool` is gone);
    - `S.report` for the incident report (the TV keeps `S.debrief.kicker` / `steps` until E3a).
    - `story2.test.tsx` checks event mode's own keys (now the storm wording and `S.event.pod`).
  - **Engineering report:** kicker "· supply deck". **Tool reveal:** a supply pod, with engineering's note and CORA's
    new procedure.
  - **Act III readout:** CORA's `followLine` adds a line when more than 3 answered rounds went against the crystal,
    or when every round followed it. Timeouts don't count.
  - **Resolution** (new phase `resolution`, `Resolution.tsx`):
    - `startDebrief` (readout, "The storm passes") goes there when `debriefAvailable`.
    - `openReport` goes on to `debrief`.
    - It shows the station stable and CORA's line `S.crew.resolution`.
  - **Debrief = incident report:** kicker `S.report.kicker`. Step 1's side is `ThreeNumbers`: Act I 100% plus your
    score, 75%, and `dialsRate`. The no-signalling step adds `S.report.noJam`.
  - **Landing:** the storm tagline and the "night shift" solo subtitle.
- **Saved or not (2026-10-30):**
  - `stationSaved(s)` (= `act3Passed`) is the one value for "the gate passed".
    - When the debrief opened only after the final Act III wave, the station was not saved.
    - `savedTuning` records the dials of the first passing wave. `reportTuning` / `stationRate` give the dials the
      report talks about.
  - The ending and the report follow `stationSaved`:
    - **resolution:** `S.resolution.log` / `logNotSaved`; CORA's `crew.resolution` / `resolutionNotSaved`; the art is
      calm when saved and `damaged` when not, both `clearing`;
    - **incident report step 1:** the Act III card is the player's rate when saved, else the best 85.4% with
      `act3Yours`; the summary is `story` / `storyNotSaved`;
    - **step 2:** `PlanVsCrystals` shows "Your dials" only when saved.
  - **`StationVisual` props** (all optional, off by default for the TV and the landing):
    - `storm`: flare + static, one level down;
    - `damaged`: level 1, no alarm;
    - `clearing`: the storm overlay fades out on mount.
    - Storm is used on both storm steps and the readout banner; the intro and Act I stay calm.
  - **`pnpm shots`:** the main run is the not-saved path. A second run tunes to 0° / 45° and captures
    `resolution-saved` and `debrief-1-saved`.
- **Open questions:** which Atlas sound engine for sfx; event-mode host (a venue laptop is the documented default).
- **History:** M0–M5 were built during Moth Hack 2026 (submitted 2026-10-06; old demo
  https://quantum-crew-iota.vercel.app/solo) in github.com/WWStoryMode/moth-hack-2026 `apps/quantum-crew`, then moved
  here (2026-10-16) as a standalone repo with the atlas-client vendored. Submission record: `docs/moth-hack-2026/`.
  M6 (Act I) was never built during the hackathon; it was built for solo on 2026-10-30.
