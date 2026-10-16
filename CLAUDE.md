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
- **Decisions:** marginals in `simulate` are the fraction of CLOSED valves. In simulation, who measures first is a coin
  flip per round unless `order` is given. Solo: the player always measures first; Act II plan pickers feed the
  1,000-round test (rounds are tapped live); solo pacing (2026-10-06, user request): 5 s rounds, 2.2 s result,
  1 Act II batch before the engineering report; the meter spans 50–100%; the 75 line appears from the ceiling reveal
  and 85.4 in Act III; debrief unlocks at a ≥ 80% 1,000-round test or after 2 Act III batches; hint after 1 Act III
  batch under 80% (both lowered 2026-10-06 at the user's request). No framer-motion yet (CSS animations suffice); sounds and mute toggle are M5.
  Event: rounds 3.5 s (MP_ROUND_MS); the huddle's end auto-starts the batch; a round resolves early once everyone
  answered; joiners mid-batch are seated after it; max 4 per table; empty seat = bot (always OPEN in Act II);
  the TV QR uses the URL the TV was opened at. Act III: bots measure at round start (always first); tunings snap to
  the 8 dial stops; the tool unlocks only after the ceiling reveal; hint and debrief step are TV-local state;
  per-seat marginals are sent only in the debrief phase (plus a pooled "whole crew" row).
- **Deploy:** solo = static build on Vercel (PlayableStories team); event mode needs a Node host with WebSockets (TBD).
- **Open questions:** which Atlas sound engine for sfx; event-mode host.
- **History:** M0–M5 were built during Moth Hack 2026 (submitted 2026-10-06; old demo
  https://quantum-crew-iota.vercel.app/solo) in github.com/WWStoryMode/moth-hack-2026 `apps/quantum-crew`, then moved
  here (2026-10-16) as a standalone repo with the atlas-client vendored. Submission record: `docs/moth-hack-2026/`.
  M6 (Act I) was never built.
