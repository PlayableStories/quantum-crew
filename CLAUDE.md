# Quantum Crew

Working notes for Claude. Read this before working on the game and keep it updated (layout, decisions, status).
This repo is a Playable Stories example of a game built with an AI coding agent.

## Workflow
- One branch + PR per feature or milestone; the user reviews before merge. Never push to `main` directly.
- Before a PR: `pnpm typecheck && pnpm test && pnpm build` (and `pnpm smoke` when touching event mode). CI
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
  `--hot` tokens), never colour alone; win/loss keeps green/red. Solo results name the cause; event phones and TV
  only get win/timeout from the server, so they show Stable / Leak. `RingDiagram` sits in the rule on the solo intro
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
  tuning shows the crewmate's dials locked at `OPTIMAL_TUNING.B`. Event mode's bots behave as before: empty seats play
  `BOT_ACT2_PLAN`, and the TV's ceiling text uses `S.ceiling.lead`.
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
  Event: rounds 3.5 s (MP_ROUND_MS); the huddle's end auto-starts the batch; a round resolves early once everyone
  answered; joiners mid-batch are seated after it; max 4 per table; empty seat = bot (always pumps clockwise in Act II);
  the TV QR uses the URL the TV was opened at. Act III: bots measure at round start (always first); tunings snap to
  the 8 dial stops; the tool unlocks only after the ceiling reveal; hint and debrief step are TV-local state;
  per-seat marginals are sent only in the debrief phase (plus a pooled "whole crew" row).
- **Deploy:** solo = static build on Vercel (PlayableStories team); event mode needs a Node host with WebSockets (TBD).
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
      `S.ceiling.truth`; the TV keeps `S.ceiling.lines`.
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
    - limit above, right-aligned to the bar's end;
    - survival below, ending at its line.
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
    - CORA calls her reading and her pump direction over the radio ("Hot here! Turning clockwise.", `crewLines`
      for `act1Batch`, from her actual pump `act1CrewPump`) and always pumps clockwise (`DEFAULT_CREW_PLAN`).
    - The round reuses `Batch.tsx` with `act === 1`: `CrewRadio` instead of `CommsDark`, a one-line rule reminder, no
      tags.
    - Results are recorded in `act1` for the debrief.
  - **The storm** (`storm` phase, `Storm.tsx`) has two steps in its own state:
    - CORA's line breaks off under static (`RadioLine interference`; the flicker stops with reduced motion);
    - then the station log.
    - `endStorm()` leads to the first huddle.
  - Solo's `Act` type is `1 | 2 | 3`. Event mode's `protocol.ts` `Act` (2 | 3) is untouched, and event mode has no
    Act I yet (a follow-up in the README).
  - Tests reach the huddle through `toHuddle()` (`src/solo/testkit.ts`), which plays Act I by the rule and leaves the
    storm.
- **Open questions:** which Atlas sound engine for sfx; event-mode host.
- **History:** M0–M5 were built during Moth Hack 2026 (submitted 2026-10-06; old demo
  https://quantum-crew-iota.vercel.app/solo) in github.com/WWStoryMode/moth-hack-2026 `apps/quantum-crew`, then moved
  here (2026-10-16) as a standalone repo with the atlas-client vendored. Submission record: `docs/moth-hack-2026/`.
  M6 (Act I) was never built during the hackathon; it was built for solo on 2026-10-30.
