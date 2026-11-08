# Quantum Crew

> A co-op party game where two tables of crew keep a space station alive, hit a wall no plan can beat, and then
> break through it with entanglement.

An example game from [Playable Stories](https://github.com/PlayableStories), built with an AI coding agent
(Claude Code). Originally made for Moth Hack 2026 (11 FQxI Challenge).

![Quantum Crew poster](showcase/poster.png)

**Play the solo demo:** https://quantum-crew-iota.vercel.app/solo

Quantum Crew is inspired by *Spaceteam*. Players never sit through a physics lecture. They feel a limit first, and
only then learn what it is.

**Learning arc:** collaborate → keep the station stable → hit a wall at 75% → experiment → get a quantum tool →
beat the wall.

## Story and player flow
*Station log · Kestrel Station.* **Kestrel Station** drifts on the edge of a young, restless star: a research platform
powered by a reactor core, cooled by a coolant **ring** that runs through its two sections. You keep the night shift
at **Table A**. **Table B** is run by **CORA**, the station's Coolant Ring Assistant: an AI, not a person (her name
always carries a small **AI** badge), who has kept the ring running for years and trusts procedure above everything.
Engineering works from the supply deck at the far end of the station. Each table runs the **pump** in its own section,
**CLOCKWISE** or **ANTICLOCKWISE**. When the star flares, one section or the other heats up without warning, so each
round each section's sensor reads **COOL** (blue, snowflake) or **HOT** (orange, flame). A **relief vent** between
the sections unlocks automatically only when **both** sections are HOT, and nobody can see whether it's unlocked.

The game's three numbers tell the story:
- **Act I, comms open (100%):** on a quiet night you call your readings over the radio, so every round can hold.
- **Act II, comms lost (75%):** a solar storm knocks the radio out in waves, and no plan agreed in advance beats 75%.
- **Act III, the crystals (≈ 85%):** two linked crystals beat every plan without carrying a single message.

Act I was milestone M6 in the hackathon plan, never built then; it's built now (solo). In solo the storm frames
everything after it: each **batch is a storm wave** (counted across Acts II and III), the huddle is **the lull**
between waves, the tool arrives in a **supply pod** from engineering, and after the last wave **the storm passes**:
the radio comes back and the debrief becomes **Kestrel Station's incident report**.

The rule follows from the plumbing, and it's always on screen next to a diagram of the ring:
*keep the coolant flowing one way round the ring; if BOTH sections run HOT, pump against each other to purge*
(quick rule: pumps MATCH, unless both sensors are HOT, then they must DIFFER). The station needs **80%**:
the core can take one bad round in five, and no more.

| Sensors | Pumps agree | Pumps fight |
|---|---|---|
| Both COOL | ✓ **Circulating**: coolant flows round the ring | ✗ **Pressure spike**: the vent is locked |
| One HOT | ✓ **Heat carried off** to the cool side | ✗ **Pressure spike**: the vent is still locked |
| Both HOT | ✗ **Overheat**: hot coolant goes round in circles | ✓ **Purge**: the vent is unlocked and the hot coolant goes out |

**The storm on the art.** From the storm screen until the resolution, the station art shows the solar storm: the star
flaring across one edge and static over the picture, one degradation level lower. At the resolution it clears, to a
calm station if you saved it or a damaged one if you didn't. The intro and Act I stay calm. With reduced motion the
storm is a still glow and texture.

**Comms.** In Act I the radio works; from the storm on, talking is only possible between waves. Solo mode shows that
with three states:
- **Comms open** (Act I's night shift, the huddle, the readout, the engineering report, the tool reveal, tuning):
  CORA talks on the radio. In Act I she calls her reading every round; the huddle is the last chance to talk before
  a batch.
- **Comms dark** (during a storm wave): the radio is down, shown as static, and CORA says nothing.
- **Station telemetry** (after each round): one impersonal sentence on why the round held or failed, e.g. *"The
  pumps fought, but the vent stays locked unless both sections are HOT."* The ring shows both sensors and pumps.

```mermaid
flowchart TD
  intro["Intro, 2 steps: Kestrel Station;<br/>tonight's routine, the rule, 80% to survive"] --> act1
  subgraph actI ["Act I: the night shift, radio working"]
    act1["6 rounds: CORA calls her reading<br/>and which way she's turning; the rule wins every round"]
  end
  act1 --> storm["The storm: CORA's voice breaks into static;<br/>station log: a solar storm, in waves"]
  storm -- "Use the lull" --> plan
  subgraph act2 ["Act II: plans"]
    plan["Huddle: last chance to talk<br/>pick both plans, Lock in the plan"] --> batch2["Batch: 12 live rounds<br/>comms dark, telemetry"]
    batch2 --> read2["Readout: CORA reacts<br/>+ the plan's four cases (exact)"]
    read2 -- "Back to the huddle" --> plan
  end
  read2 -- "Call engineering<br/>(after 1 batch)" --> ceiling["Engineering report: 75%<br/>fills the rest of the board"]
  ceiling --> tool["The Entanglement Tool arrives"]
  tool --> tune
  subgraph act3 ["Act III: the tool"]
    tune["Crystal plan: your settings, CORA's fixed plan, a live hint<br/>(engineering's answer after a wave under 80%)"] --> batch3["Wave: 12 rounds; the crystal is measured<br/>at round start, you set the pump"]
    batch3 --> read3["Readout: followed N of 12<br/>+ each case's gap and chance (exact)"]
    read3 -- "Change your crystal plan" --> tune
  end
  read3 -- "The storm passes: the crystal plan played is ≥ 80% exactly<br/>or after 2 Act III waves" --> resolution["Resolution: the radio comes back<br/>CORA: we were in step anyway"]
  resolution -- "Read the incident report" --> debrief["Incident report: 4 steps<br/>(the three numbers first)"]
  debrief --> credits["Credits → Play again / Home"]
```

0. **The night shift (Act I).** Six rounds with the radio working. CORA opens with *"Quiet night. Each round I'll
   call my reading and which way I'm turning. Call yours, and keep us in step."*, then each round calls her reading
   and her pump, which varies at random from round to round (*"Cool here. Turning anticlockwise."* / *"Hot here!
   Turning clockwise."*). You see your own sensor, so with both readings and her pump the rule tells you exactly what
   to do: match her pump, unless both are HOT, then turn the other way to purge. The six rounds include every combination of the two
   sensors, with at least one both-HOT round (never the first), so you see a purge. You have 8 seconds; a mistake or
   a timeout loses the round, explained like any other result. The stability gauge shows the station holding near
   100%. Then **the storm**: CORA starts a line and it breaks into static (*"Something's coming off the star. Hold
   the pumps st—"*), and the station log explains: a solar storm arriving in waves, which the radio won't survive; it
   may come back for a moment between them. **Use the lull** takes you to the first huddle.
1. **Agree a plan (Act II): the last chance to talk.** Two dialogue boxes, **You** and **CORA [AI]**, each offer
   the four plans (always clockwise, reverse when HOT, reverse when COOL, always anticlockwise) with their COOL/HOT
   moves as icons. You pick for both; CORA starts on always clockwise ("standard procedure") and confirms what you
   pick for her on the radio. **Lock in the plan** starts the batch: comms go dark until it ends. Every pair you play
   goes on the **plan board**, your four plans against hers. Its shape is the wall: 8 pairs reach 75%, 8 reach 25%,
   and none beats 75%.

   | You ↓ · Crewmate → | Always clockwise | Reverse when HOT | Reverse when COOL | Always anticlockwise |
   |---|---|---|---|---|
   | **Always clockwise** | 75% | 75% | 25% | 25% |
   | **Reverse when HOT** | 75% | 25% | 75% | 25% |
   | **Reverse when COOL** | 25% | 75% | 25% | 75% |
   | **Always anticlockwise** | 25% | 25% | 75% | 75% |

2. **Play a batch.** Twelve live rounds with **comms dark**. A reminder shows the agreed plan, e.g. *"Agreed: you
   COOL → clockwise, HOT → anticlockwise · CORA always clockwise"*. CORA plays the plan you set for her. Your plan's
   direction is tagged "Plan", but you set the pump yourself and can go against it (5 seconds; running out of time
   is a loss). Each result shows the cause (Circulating, Heat carried off, Purge, Pressure spike, Overheat or Too
   slow), one sentence of station telemetry on why, and the **coolant ring**, with both sensors and both pumps
   labelled. The result stays until you tap **Next round** (or press Space / Enter); after 6 seconds it moves on by
   itself. The ring plays the round back:
   - each half lights up COOL or HOT;
   - each pump spins the way it ran;
   - the vent opens on a double HOT;
   - you see the coolant circulate, carry the heat off, purge out of the vent, spike where the two flows collide,
     overheat, or stall at a pump that never moved.

   On a landscape screen the ring sits beside your sensor and stays blank during the round itself, so it never gives
   away your crewmate's sensor. On a phone a smaller ring appears with the result. With reduced motion it's a still
   picture with the same marks. Every stability gauge runs from 0% to 100%.
3. **Readout.** Comms are back on: CORA reacts to the batch with the facts of one round (e.g. *"Round 7: you were
   hot, I was cool, and our pumps fought."*). She never says who reversed or whose fault it was: with different plans
   the pumps can fight without anyone going against the plan. Twelve rounds are noisy, so **If we both follow the
   plan perfectly** shows the plan's four sensor combinations (COOL/COOL, COOL/HOT, HOT/COOL, HOT/HOT, each equally
   likely): each side's pump, the outcome and ✓ or ✗, then the true rate, e.g. *"3 of 4 cases: 75%"*. It's exact,
   with no sampling. If the batch passed 80% on a plan that can't: *"Above 80% this time, but this plan's true rate
   is 75%. Twelve rounds is mostly luck."* Back in the huddle with the same plan, CORA suggests a pair you haven't
   tried.
4. **Call engineering.** After the first batch you can call engineering (or go back and try more plans). Engineering
   works out every pair you didn't try (a corner mark on those squares): *"You tried 2. We ran the other 14."* The
   board shows every square's **exact** rate, 75% or 25%: *"The best plan's true rate is exactly 75%: it loses one
   round in four. The station needs 80%. A batch above 75% is luck."* The crewmate: *"So it was never us."* Then: *"Then we need something that isn't a plan."*
5. **Receive the tool.** During a lull a **supply pod** docks from engineering. The game changes look (a live
   Entanglement Shader, two synced crystals). Engineering's note: the crystals carry no messages, so the storm can't
   jam them. *"Think of them as entangled coins: each lands at random, but a linked pair measured at the same setting
   always lands the same way."* *"The crystals don't replace your plan. They change what a plan can say."* CORA:
   *"A crystal that tells me which way to turn. Fine. That's my new procedure."*
6. **Your crystal plan (Act III; event mode's crystal plan since S3, with CORA as the fixed partner).** The card has
   the shape of an Act II plan (*"Like an Act II plan, but for each reading you choose a crystal setting, not a
   direction."*): a setting for COOL and one for HOT, each picked from the 8 settings (0° to 157.5°), starting at
   0°/0°. CORA's plan sits beside it, read-only (*"CORA has set her own plan."*: COOL 22.5°, HOT 157.5°; one line on
   phones), and she says so on the radio. Below:
   - the **starting line**, computed live: *"CORA measures at COOL 22.5°, HOT 157.5°. With your plan as it is, you
     two hold 67.7%. Can you do better?"*;
   - **clue 1** from the first visit: the live hint for your weakest case, which only ever moves your own setting
     (*"CORA's plan is fixed: move your HOT setting further from hers."*), or **Found it: 80%+**, and the nudge (the
     differ gap can never be bigger than the three match gaps added together);
   - the read-only **fan**: the four settings, each case's gap and its chance;
   - **the crystals' rule** (each crystal is a coin flip; linked crystals land the same way more often the closer
     their settings, with the gap table; follow your crystal and your pumps match exactly when the crystals agree),
     in full on the first visit, then behind a **Crystal rule** chip;
   - after a wave that didn't pass, **Ask engineering for the answer**: the settings spread 22.5° apart, your row
     (COOL 0°, HOT 45°) and **Use these settings**, which completes CORA's plan to 85.4%.

   **Lock in your crystal plan** starts the wave. **Rounds** last 5 seconds, like Act II. The station measures both
   crystals at their planned settings when the round starts; you see *"Your sensor: HOT → your plan: 45° → the
   crystal says ANTICLOCKWISE (this time; it could have been either)"*, with *"Follow your crystal: that's how your
   plan works. Going against it is a guess."* Your only action is the pump: Enter follows the crystal, A / C choose
   directly. Scoring uses the pump you set; CORA always follows her crystal.

   | Your crystal plan (COOL / HOT) | Win rate |
   |---|---|
   | **0° / 45°** | **85.4%**, the only best plan of the 64 |
   | 0°/22.5°, 0°/67.5°, 22.5°/45°, 157.5°/45° | 80.2%, which passes the gate |
   | 0° / 0° (the start) | 67.7% |

7. **Readout and the gate.** The readout says *"You followed the crystal in N of 12 rounds."* CORA notices too:
   *"You went your own way a lot. I just did what my crystal said."* (more than 3 rounds against it) or *"You
   followed your crystal every round. So did I."* **If we both follow
   the crystals** shows the four sensor combinations with each case's gap and the exact chance it holds, then
   the crystal plan's true rate. A luck line appears when the batch and the true rate disagree about passing 80%. The
   **debrief unlocks after a wave played with a crystal plan whose exact rate is 80% or more**, whatever the wave
   scored. Otherwise you ride out another wave (with engineering's answer on offer); after **2** Act III waves it opens either way, so every
   player reaches the end. **The storm passes** first, and how it ends depends on whether you **saved the station**
   (your crystal plan passed the gate):
   - **Saved:** the station holds, calm and clear, and the radio comes back. CORA: *"I couldn't hear you the whole
     time. But we were in step anyway."*
   - **Not saved** (the report opened only because the last wave was played): engineering held the core together
     with emergency measures, and the station art shows the damage. CORA: *"We made it, just. Those crystals can do
     better than that. I'd like to know how."*

   **Read the incident report** opens the debrief.
8. **The incident report (debrief).** The physics words appear only here, in four steps. The first opens with the
   three numbers side by side: Act I with the radio (100% possible, and your own Act I score), Act II's best plan
   (75%) and Act III's crystals. If you saved the station, that's your crystal plan's exact rate, with *"Talking made every
   round winnable. No plan could replace talking. The crystals beat every plan without carrying a single
   message."* If not, the report doesn't pretend: the card leads with the best crystal plan (85.4%) and shows
   yours underneath (e.g. "your crystal plan, 67.7%"), and the summary says the best crystal settings beat every plan, while
   yours didn't get there this time. Step 2's side-by-side views also show the best crystal plan unless yours saved
   the station.
   - **No plan beats 75%:** the fiction mapped back to the game (sensors = input bits, pumps = output bits, "match
     unless both HOT" = the CHSH rule), and the wall was a Bell inequality, with your Act II rate. Mixing plans at
     random only averages cells on the plan board, so it can never beat the best cell.
   - **Entanglement broke through:** the crystals agree with probability cos²(θA − θB), up to 85.4% (the Tsirelson
     bound), with your crystal plan's true rate. Two four-case views sit side by side: the best plan (three cases
     always held, one always lost: 75%) and your crystal plan (or the best one, if yours didn't pass), where every case holds
     about 85%. *A plan has to give up one case completely; the crystals spread a small loss across all four.*
   - **But no messages:** each pump runs clockwise exactly 50% of the time whatever the partner's sensor read
     (computed exactly), so no message gets through (no-signalling). Your own 12-round numbers sit underneath, and
     the report adds: *"That's why the storm couldn't jam them: there was no signal to jam."*
   - **Credits** (the Atlas asset list is behind **How the art was made**), then *Play again* or *Home*.

   Each step's explanation sits beside your own numbers on a landscape screen, and above them on a phone.

All player-facing text is in `src/strings.ts`; pacing and unlock rules are in `src/config.ts`.

## How to play (solo)
Open the app and choose **Solo demo**. It takes about 6 minutes on a phone or a laptop. On a laptop or a landscape
iPad the type, plan board, crystal plan and ring scale up with the screen, and every screen still fits without scrolling.

1. **Briefing.** You keep the night shift at Table A on Kestrel Station. CORA, the station's AI, is Table B. Each round
   your sensor reads **COOL** or **HOT**, and you set your pump **CLOCKWISE** or **ANTICLOCKWISE**. The station rule:
   *pumps MATCH, unless both sensors are HOT, then they must DIFFER* (the vent only unlocks on a double HOT). After
   the briefing it stays on screen as a one-line chip; **Explain** opens the full rule card.
   The station needs **80%**.
2. **Act I: the night shift.** Six rounds with the radio working: CORA calls her reading and which way she's turning ("Hot here!
   Turning anticlockwise."; it varies at random), so the
   rule with both readings wins every round (8 seconds each). Then the storm knocks the radio out.
3. **Act II: plans.** In the huddle (the last chance to talk), pick your plan *and* CORA's, then **Lock in the
   plan**. Then play batches of 12 rounds (comms dark; the station's telemetry reports each round). Between
   batches CORA reacts on the radio, and the readout shows your plan's exact rate case by case. Whatever you try, no
   pair beats 75%.
4. **Engineering report.** After the first batch you can call engineering (or try more plans first): they fill in
   every pair you didn't try, and none beats 75%.
5. **Act III: the Entanglement Tool.** You plan a crystal setting for COOL and one for HOT; CORA's plan is fixed. A
   live hint points at your weakest case. In each round the station has already measured your crystal: it suggests
   a pump, and you set it (follow it or not). Find a crystal plan whose exact rate passes 80%; after a wave that
   doesn't, you can ask engineering for the answer, and after two waves the debrief opens either way.
6. **The storm passes, then the incident report.** You learn the physics and see your own numbers, starting with
   the three that tell the story (100%, 75%, ≈ 85%), then the credits.

Keyboard: **A / ←** = ANTICLOCKWISE, **C / →** = CLOCKWISE. Act III: **Enter** follows the crystal. On a round's result, **Space / Enter** = Next round.

## How to play (event)
Two tables of players, one phone each, and a TV or projector. A facilitator runs the session from the TV.

1. Open **/screen** on the TV (landing page → **Host on TV**). It creates a station with a 4-letter code and a QR code.
   The QR code and the printed link both point at the join address (see
   [Run event mode at a venue](#run-event-mode-at-a-venue)).
2. Players scan the QR (or open **/play** and type the code), enter a name and pick **Table A** or **Table B**.
   The server pairs A₁↔B₁, A₂↔B₂… (up to 4 pairs). **CORA**, the AI crewmate (shown with an **AI** badge on the TV
   and on her partner's phone), fills any empty seat.
   **Optional, the facilitator's phone remote:** press **Remote** at the top right of the TV and scan its QR code
   with your own phone. It opens **/host**, which runs the session from anywhere in the room (the next step as one
   big button, Play / Pause, what to say, who is still choosing). The remote's link carries its own key (not the TV's),
   and **Unpair remotes** in the same dialog makes a new one. See
   [Using the remote](docs/facilitator.md#using-the-remote).
3. **Start the night shift:** the TV shows the briefing (Kestrel Station, the star, the two tables, the coolant ring
   and its rule); phones show the quick rule.
4. **Start the rounds:** Act I, six rounds with the radio working. Each phone shows its own sensor and, on the radio,
   the partner's reading, then their pump as soon as they set it (CORA calls hers at the start of the round). Players
   may talk out loud too. A pump can be changed until the round ends; a round ends after 8 s, or once both pumps
   are set and have stayed put for 1.5 s. Each pair meets all four sensor combinations, never a double HOT first.
   Phones and the TV's pair cards show the cause (Circulating, Heat carried off, Purge, Pressure spike, Overheat,
   Too slow).
5. **The storm** follows by itself: every phone's radio breaks up mid-line under static, then the TV shows the
   storm log.
6. **Use the lull:** the last chance to talk. Each player picks one of solo's four named plans (always clockwise,
   reverse when HOT, reverse when COOL, always anticlockwise), and the partner's choice shows live on their phone.
   The lull isn't timed (the TV shows how long the room has been talking); **Start the wave** ends it, the storm wave
   hits, the radio goes dark and the plans lock.
7. Each round of a wave (8 rounds), every phone shows only its own sensor, both locked plans (stamped **Plan
   locked**; the TV's banner says **Plans locked**) and two pump buttons (either can be tapped). After setting a pump a phone says whether the partner has chosen (never
   what). A result shows the cause, a small ring with both sensors and pumps, and a line of station telemetry. The TV shows the round timer, who has answered and each pair's cause. The station's
   stability is pooled over the last 48 wave rounds across all pairs (Act I has its own rate), and each pair also has
   its own mini-meter (three or four pairs sit two to a row).
8. After each wave the TV shows every pair's locked plans case by case (the four sensor combinations, each with
   the pumps, ✓ or ✗ and the cause), the plan's true rate, the wave's score, and a luck line when the wave beat 80%
   but the plan can't.
9. Play a few waves, then **Reveal ceiling**: the engineering report shows the 4×4 plan board at exact rates (75% or
   25%), every pairing the crew played marked as tried and the rest run by engineering. No plan beats 75%.
10. **Unlock tool**: a supply pod from engineering brings two linked crystals for every pair, one at each table;
   engineering's note says they carry no messages, so the storm can't jam them, and *"The crystals don't replace your
   plan. They change what a plan can say."* The TV shows **the crystals' rule** in three lines (basic information,
   not a clue; since E3e): each crystal alone says CLOCKWISE or ANTICLOCKWISE at random, like a coin flip, whatever its
   setting; two linked crystals land the same way more often the closer their settings (the gap table: 0° 100%,
   22.5° 85%, 45° 50%, 67.5° 15%, 90° 0%, from `matchProbability`); and followed crystals make the pumps match
   exactly when the crystals agree, so keep settings close in the three cases that need matching pumps and far apart
   when both sensors are HOT. The TV shows the rule on the tool reveal and in every Act III lull; phones have it and
   the clues in sheets (**Crystal rule**, **Clues (n)**, counting 0–2) from here on.
11. **The Act III lull: a crystal plan.** Each player's card has the same shape as an Act II plan: *"When your sensor
   reads COOL or HOT, the station measures your crystal at:"* COOL [0° ▾] and HOT [0° ▾], each picked from the 8
   settings (0° to 157.5°). The partner's plan shows live (CORA's is read-only: she has set her own). The card's first
   line says *"Like an Act II plan, but for each reading you choose a crystal setting, not a direction."* A read-only
   fan shows the pair's four settings and the gap in each case (folded modulo
   180°, so 0°–90°: 0° and 157.5° are 22.5° apart). The first Act III lull opens with **clue 1** (below): each phone shows the
   pair's live rate and hint (*"Your plans hold 75%. Your weakest case: …"*; with CORA 67.7% at 0°), and the fan shows
   each case's chance beside its gap ("gap 22.5° · 85% same"). The TV shows the situation, what players can do and
   the question (Act III's explainer), the rule and the clues so far.
12. **Act III rounds.** There is no MEASURE: at round start the room measures both crystals, each at its player's
   planned setting for their sensor reading (Table A's is a fair coin, Table B's matches it with cos² of the gap),
   and each phone gets only its own result. The phone shows the chain *"Your sensor: HOT → your plan: 45° → the
   crystal says ANTICLOCKWISE (this time; it could have been either)"* with a small read-only dial; the player's only action is the pump (the suggestion is
   highlighted, Enter follows it; they may go against it). Decision time is Act II's (`decisionMs`). Scoring uses
   the pump actually set, and the room records who followed. CORA in an empty seat always follows.
13. After each Act III wave the TV shows every pair's locked crystal plans case by case (each case's gap and exact
   chance of holding), their true rate, **found it: 80%+** on pairs that reached 80%, a luck line when the wave and
   the true rate disagree about 80%, the wave's score, plus the crew's followed count and its crystal plans'
   average. **Saved or not:** once a wave ends with that average at 80% or more, the station counts as saved (it
   stays saved).
14. **The clue ladder** (two steps since E3e; it only rises, until Reset, and the room keeps it):
   1. **The hint and the nudge**, automatically when the first Act III lull opens (or with a wave started straight
      from the tool). Each pair's hint is computed from its **current** crystal plans and follows every setting
      change, live: at the start (0° everywhere) every pair's weakest case is both HOT, gap 0°, differ 0% of the time:
      move those settings further apart. Phones show their own pair's hint (with CORA as partner, it only asks the
      player to move their own setting); the TV lists every pair's; pairs at 80%+ see **Found it: 80%+**, live. The
      nudge (*"the differ gap can never be bigger than the three match gaps added together…"*, true for every plan;
      a test checks all 4,096 combinations) is on the TV and in the phones' Clues sheet. After a wave, a pair below 80%
      gets its weakest case outlined on the TV with which way to move.
   2. **The answer**, released by the facilitator with **Next clue** (TV or remote) once an Act III wave has been
      played: *"Next clue: the answer (2 pairs not yet at 80%)"*. Spread the four settings 22.5° apart (A: COOL 0°,
      HOT 45°; B: COOL 22.5°, HOT 157.5°): three match gaps of 22.5° (85% the same), a differ gap of 67.5° (85%
      different), 85.4%. The TV shows it in one line on the wave done and in full with its fan in the lull; each phone
      shows its own row, and pairs still below 80% get **Use these settings** (each partner applies their own row;
      with CORA, the player's row completes her fixed plan).
15. **The storm passes** (after at least one Act III wave): the TV clears the storm from the station, calm if the
   crew saved it and damaged if not, with the station log's line. The radio comes back: each phone prompts the
   player to tell their partner what they were thinking during the storm, and CORA's partners hear her own saved
   or not-saved line.
16. **Incident report** on the TV (Back / Next; the step is held by the server, so a refreshed TV keeps its place),
   solo's report in the crew's version:
   - the three numbers: Act I with the radio (100% possible, plus the crew's score), Act II's best plan (exactly
     75%) and Act III's crystals (the crew's crystal plans' average). When the crew wasn't saved, the best crystal
     plans (85.4%) lead and the crew's number sits underneath;
   - the best plan beside the crystals: the best pair's crystal plans if one reached 80%, else the best ones;
   - no-signalling: exact 50% for both tables, the crew's real numbers, and why the storm couldn't jam the
     crystals;
   - credits.

   Each phone shows its own pair's three numbers: their Act I score, their locked plans' true rate and their crystal
   plans' exact rate.

At the engineering report, human pairs get a prompt instead of CORA's personal line ("Did you blame each other? No
plan beats 75%: it was never either of you."); pairs with CORA hear her line.

**Pacing.** The facilitator paces the room from the TV. The host row shows only what applies now, plus Play / Pause
with a small **▾** for the speed, and Reset. Space or → presses Next; P switches between play and pause. Every change
takes effect at once, on the running round or result too.
- **Manual (Pause;** the default for each act's first wave, the night shift included): no countdown. A round closes
  when every pair has chosen (the TV shows who is still choosing) or on **Next** ("Close the round"); the result stays
  on the TV and phones until **Next** ("Next round"). Players can still answer.
- **Auto (Play;** the default after that): rounds and results run by themselves; the button shows the seconds left.
  **Next** still skips ahead.
- **Speed (▾):** **Relaxed** (12 s to decide, 15 s in the night shift, 8 s per result) or **Brisk** (the original
  timers). Picking one also plays. A speed change mid-round counts the time already spent (at least 2 s stay).
- Once the facilitator presses Play or Pause, that choice holds for later waves until **Reset**.
- Every host command carries the room's current step, and the server ignores one sent from a step it has already
  left, so a double press never skips two steps (the TV and the remote can press at once).

**Leaving.** A phone's **⋯** menu (beside mute) has **Leave the game**, behind a confirmation where staying is the
primary action. A player who leaves, or whose phone drops out, keeps their seat: CORA covers it (after a natural
delay, like everywhere else) until they rejoin with the same name and table. A refreshed TV resumes the same station. Running a session for real: [`docs/facilitator.md`](docs/facilitator.md) (after a talk on quantum, see
[Pairing the game with a talk on quantum](docs/facilitator.md#pairing-the-game-with-a-talk-on-quantum)); watching a
playtest: [`docs/playtest.md`](docs/playtest.md).

From the lobby, **Use the lull** or **Start the wave** still skip the night shift and go straight to Act II (for a
short session).


## The physics
This is the **CHSH game**, a Bell test. Two players who can't talk each get a random bit (the sensor: COOL = 0,
HOT = 1) and output a bit (the pump: CLOCKWISE = 0, ANTICLOCKWISE = 1). They win if `a XOR b == x AND y`, which is
"pumps match unless both are HOT". The ring, the pumps and the vent are the story around that rule.

- **Classical limit: 75%.** Every plan agreed in advance, random or not, is at best a mix of the 16 deterministic plan
  pairs, and none of those wins more than 3 of the 4 sensor combinations.
- **Quantum limit: cos²(π/8) ≈ 85.4%.** The players share an entangled pair of qubits (the Bell state |Φ+⟩). Each measures at
  an angle chosen by their own sensor, and the results agree with probability cos²(θA − θB). The best angles are
  A: 0°/45° and B: 22.5°/−22.5°. No quantum strategy beats this (the Tsirelson bound).
- **No signalling.** Each player's own pump direction is a 50/50 coin whatever the partner's sensor or dial. Only the
  *correlation* between the two players changes, so the tool can't carry a message. The debrief shows this with the
  player's own tool settings.

Further reading: [IBM Quantum Learning: the CHSH game](https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/chsh-game).

In the game, the entangled pair is simulated with the exact quantum probabilities (`src/shared/chsh.ts`). The first
player to measure gets a fair coin, and the second player's result matches it with probability cos²(Δθ).

## Atlas engines
The station art, its degradation levels, the crew avatars, the tool reveal and the sounds are made with Moth Quantum
Atlas engines on platform.mothquantum.com. They are listed with their parameters in `src/assets/atlas/list.ts` and
on the Credits screen. Any asset that hasn't been added yet shows a placeholder (CSS/SVG art, or a short Web Audio
sound), so the game always works.

| Asset | Engine |
|---|---|
| `station-base`, `crew-icons` | Tessa (`tessa-image-v1`) |
| `station-stability-0…4` | Quantum Blur (`blur-v1`) |
| `entanglement-reveal` | Entanglement Shader (`entanglement-shader-v1`), **rendered live** (see below) |
| `sfx-alarm`, `sfx-win`, `sfx-reveal` | Atlas sound engine (to confirm) |

### The Entanglement Shader, live
`entanglement-shader-v1` doesn't return an image: it simulates light bouncing between stacked, ultra-thin conducting
layers with entangled (quantum) interactions, and returns a shader plus two lookup tables (how much red, green and
blue light is reflected or transmitted at each viewing angle). The engine's raw output is committed in
`atlas-src/entanglement-shader/`. `pnpm bake-shader` decodes its lookup tables into
`src/assets/atlas/entanglement-lut.json`, and `src/atlas/entanglementShader.ts` runs a WebGL 2 port of the engine's own
GLSL in the browser. The tool's two crystals tilt in sync and shift colour with the viewing angle, and the same
shader ripples behind the tool reveal and every Act III screen. Without WebGL 2 the CSS placeholders show instead.

### Generating the station art (`pnpm gen-assets`)
`pnpm gen-assets` draws a 64×36 pixel-art station and a 64×32 crew sprite in code
(`scripts/lib/inputs.ts`), uploads them and runs the engines through `@moth-hack/atlas-client` (1 credit per job):
Tessa on a noisy `fake_fez` simulator for `station-base` / `crew-icons`, then Quantum Blur at strengths
0.05 / 0.25 / 0.45 / 0.7 / 1.0 for `station-stability-4 … 0`. Each result is saved with a `.provenance.json` (engine,
job id, params), which the Credits screen shows. Existing assets are skipped unless `--force`; `--dry-run` shows the
plan. On 6 Oct the Tessa engine timed out (`engine_timeout`, three tries, also on `aer`), so the five Blur levels were
made from the drawn station with `--blur-source drawn`; `station-base` and `crew-icons` keep their placeholders.

### Adding an asset
1. Make it on the platform and save it into `src/assets/atlas/`, named after its key with any extension
   (`station-stability-2.png`, `entanglement-reveal.webm`, `sfx-win.mp3`…). Vite picks it up; no code change.
2. Fill its `params` in `src/assets/atlas/list.ts` so the Credits screen shows how it was made.
3. Run `pnpm assets` for a checklist: present / missing, missing params, files over
   5 MB, and types the repo gitignores (`.mp4`, `.wav`: use `.webm`, `.png`, `.mp3`).

Where they appear: `station-base` and `station-stability-0…4` on the TV, readouts and landing (the level follows
stability: 0 failing … 4 stable); `crew-icons` (one image, Table A left half, Table B right half) on the TV pair
cards and phones; `entanglement-reveal` behind the tool reveal and as the Act III background; `sfx-win` on a won
round, `sfx-alarm` when stability drops below 80% or a batch ends below it, `sfx-reveal` when the tool arrives.

### Sound
Every screen has a mute button. Sound is on by default in solo and on the TV, and off by default on event phones
(a room of 8 phones chiming is a lot); each device remembers its choice.

## Run it locally
Needs Node ≥ 22.18 (`nvm use` picks up `.nvmrc`) and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev        # http://localhost:5173/solo
pnpm dev:phone  # same, reachable from a phone on your Wi-Fi
pnpm test       # core logic + solo flow tests
pnpm sim        # classical best, quantum optimum, top-5 dial setups
pnpm assets     # Atlas asset checklist
pnpm build      # static build in dist/
```

`pnpm dev` also runs the station (WebSocket at `/ws`) inside the Vite dev server, so event mode works locally.
To test with real phones, open the TV page via the **Network** URL that Vite prints (e.g. `http://192.168.x.x:5173/screen`)
so the QR code points somewhere phones can reach. To test alone, use one `/screen` tab and a few `/play` tabs.

```sh
pnpm smoke     # real WebSocket server + 1 TV + 4 phones, one Act II batch
pnpm session   # a whole session in-process with a fake clock (see below)
```

**Debug jump (testing):** on the TV (`/screen`), **D** opens a small panel with **Jump to Act II (lull)** and **Jump
to Act III (tool reveal)** (the room's `debugAct2` / `debugAct3` host commands; TV only, never from the remote, not
during a wave). Act III arrives as Reveal ceiling + Unlock tool leave it (no clue yet). It works in every build.
**F** on the TV toggles full screen (the browser's own, so no frame shows; F or Esc leaves it).

`pnpm session` (`scripts/session.ts`) runs the station in-process with a fake clock and a seeded RNG, so it takes
about a second and is the same every run. It plays a whole session: 4 pairs join and a 9th player is turned away;
the night shift (the briefing, then Act I played by the rule over the radio, with one player changing their mind and
every round held) and the storm; a player drops out mid-wave and rejoins their seat; the TV disconnects and resumes; one Act II wave; the engineering
report; the tool (clue 1); Act III, where the room measures the crystals (no phone ever sends `player:measure`): one
lull that opens with clue 1 (every pair's live hint is both HOT at 0°; Ada's pair moves to the answer and sees "found
it" before any wave; the answer is refused before a wave), wave 1 (77.6%, not saved), the answer from the remote (the
button counts 3 pairs not yet; a double press moves once), every player uses their own row, and wave 2 (85.4%,
saved); the debrief. CI runs it after `pnpm smoke`.

### Screenshots (`pnpm shots`)
`pnpm shots` plays the whole solo flow like a player in headless Chromium and saves a screenshot of every screen:
landing, both intro steps, the huddle (first view, after picking a plan from the keyboard, and with the rule sheet
open), a live round in Acts II and III with the first result of each outcome (circulating, heat carried off, purge,
pressure spike, overheat, too slow; the last Act II round is left to time out; results move on by Next round, Enter
and the auto-advance), both readouts (Act II also with the four cases open), the engineering report, tool reveal, the crystal plan screen (first visit with the
rule; again after a wave under 80% with the rule and engineering's-answer sheets), the crystal's suggestion in an Act III round, the resolution and every debrief step on the not-saved path (the
plan stays at 0° / 0°), then a second short run that asks engineering for the answer and uses it ("Use these
settings", 0° / 45°) for the saved resolution and the saved report's first step and credits (with the asset-list
sheet).

```sh
pnpm exec playwright install chromium   # once (or set SHOTS_CHANNEL=chrome to use your installed Chrome)
pnpm shots                              # desktop 1440×900, iPad landscape 1180×820, iPhone 390×844
pnpm shots --all                        # also iPhone SE 375×667 and iPad portrait 820×1180
pnpm shots --out before                 # name the run (default: latest)
pnpm shots --compare before after       # one contact sheet per screen: before above after, sizes side by side
```

It builds the site and serves it with `vite preview` (static, like the deploy). Nothing is added to the app for it:
the script seeds `Math.random` before the page loads, so the same rounds come up every run, and it controls the round
timers with Playwright's clock. Output goes to the git-ignored `shots/<out>/<size>/`:
- `NN-name.png` is the first viewport, which is what the player sees.
- `NN-name.full.png` is the whole page, with a dashed line at the fold.

**Event mode:** `pnpm shots --event` puts the real station on the preview server and plays a session with a TV and
two phones (Table A and Table B, one pair), plus six more players over plain WebSockets so the TV shows four pairs
(they answer every round at once and aren't screenshotted): the lobby (empty and seated), joining, the briefing, an Act I round (and
Table B's radio once Table A has set a pump), an Act I result, the storm's static and its log, the lull, a live round, a result,
wave done, the engineering report, the tool, the Act III huddle, an Act III round (and a phone that has measured), a
result, wave done and every debrief step. It runs the session twice: the TV at 1920×1080 with phones at 390×844, then
the TV at 1280×720 with phones at 375×667. The server's timers are real, so live rounds and results get viewport
shots only. `/station-info` answers a made-up `192.168.1.20` plus a VPN-like `100.101.7.3` (so the lobby shows "Not working? Try: …"), and the shots never show your machine's address. Output
goes to `shots/<out>/event/<device>-<size>/`, with the same `report.md`; `--compare before after --event` makes the
contact sheets. `--quick` runs only the tight pass (TV 1280×720 with phones 375×667), for fit work. In Act III,
Table A and B tune to the best dials, so wave done shows a pair that holds. The TV never scrolls, so for TV screens the report also flags any region whose content is cut off
(`⚠ cut off: briefing 13px`). After a wave it also checks the worst case, every pair with a luck line, and fails if
that would be cut off.

The run fails if any text in a coolant ring renders below 12px, or if any stability-gauge labels overlap. `report.md` lists, for each screen and size, the page height in screen-heights, whether the main button is visible
without scrolling, and any horizontal overflow. The run also checks that the rule sheet keeps focus inside it,
closes on Escape and hands focus back. Two runs give the same screens and the same report; a few anti-aliased pixels
can differ.

## Deploy
- **Solo only (static):** the solo mode needs no server or API key. Deploy `dist/` anywhere; `vercel.json`
  rewrites every route to `index.html`. On a static host, the event-mode buttons stay disabled.
- **Event mode:** needs one Node process with WebSockets. See [Run event mode at a venue](#run-event-mode-at-a-venue).

## Run event mode at a venue
`server/index.ts` is one Node process: it serves `dist/`, the WebSocket at `/ws`, a health check at `/healthz` and
`/station-info` (where phones should join). **Rooms live in memory:** run exactly one instance, and never restart it
during a session, because a restart ends every room. The facilitator's checklist and run of show are in
[`docs/facilitator.md`](docs/facilitator.md).

**The join address.** The TV's QR code and printed link are built from one address, chosen in this order:
1. `PUBLIC_URL` on the server, if set (e.g. `PUBLIC_URL=https://crew.example.org`);
2. the address the TV page itself was opened at, unless that is `localhost`, since phones can reach it too;
3. the laptop's own network (LAN) address, which the server detects, when the TV is open at `localhost`;
4. otherwise the TV shows a warning: its link only works on this computer.

Laptops often have several addresses (Wi-Fi plus Docker, a VPN, virtual machines), and phones can reach only some of
them. The server ranks them (`server/joinInfo.ts`): 192.168.x first, then 10.x, then 172.16–31.x, then anything else;
last come link-local (169.254.x) and VPN/carrier-grade NAT (100.64–127.x) addresses and interfaces that look virtual
(`docker`, `br-`, `bridge`, `veth`, `vmnet`, `vboxnet`, `utun`, `tun`, `tailscale`, `zt`, `wg`). The TV uses the best
one; when there are others, the lobby shows them under the link ("Not working? Try: …"), and one click makes that
address the QR code and the link (the TV remembers the choice). `pnpm start` prints every address with its network
interface, the chosen one first.

### (a) A laptop at the venue (recommended)
```sh
pnpm install
pnpm build && pnpm start   # listens on $PORT (default 8787) and prints "Phones join at: http://192.168.x.x:8787 (en0)"
```
- Open the TV page at `http://localhost:8787/screen` on the laptop (the QR uses the printed network address), or at
  the printed address itself.
- **Bring a travel router if you can.** Venue and guest Wi-Fi often stop devices from reaching each other ("client
  isolation"), and then no phone can join. With your own router, the laptop and every phone are on one network you
  control; no internet connection is needed during play.
- Check from a phone before guests arrive: open `http://<printed address>/healthz`; it should say `{"ok":true}`.
- If the laptop has a name phones can resolve, set it: `PUBLIC_URL=http://crew-laptop.local:8787 pnpm start`.

### (b) A Node host with WebSockets
Any host that runs a long-lived Node process and passes WebSocket upgrades through works:
- build: `pnpm install --frozen-lockfile && pnpm build`
- start: `pnpm start` (listens on `$PORT`; Node ≥ 22.18 runs the TypeScript directly)
- one instance only, no autoscaling, and no sleeping when idle: a stopped machine loses its rooms.
- health check: `/healthz`.

Open the TV at the host's public address; the QR code uses it. Set `PUBLIC_URL` only if phones should use a
different address (e.g. a custom domain).

**Docker.** The minimal [`Dockerfile`](Dockerfile) builds and runs the same server on port 8787:
```sh
docker build -t quantum-crew .
docker run -p 8787:8787 quantum-crew                       # add -e PUBLIC_URL=https://… if needed
```

**Example host: Fly.io** (not set up for this repo; these are the steps, nothing has been deployed):
```sh
fly launch --no-deploy      # detects the Dockerfile; set the internal port to 8787
fly scale count 1           # one machine: rooms live in its memory
fly deploy
```
In the generated `fly.toml`, keep the machine running during sessions (`auto_stop_machines = "off"`,
`min_machines_running = 1` under `[http_service]`), so an idle moment doesn't stop it and lose the rooms. Check
Fly's own docs for the current settings. Open `https://<app>.fly.dev/screen` on the TV.

**Example host for a playtest: Render's free tier** (docs only; nothing has been deployed or signed up for). Check
Render's own docs for the current options.
- **New Web Service** from the repository, **Language/runtime: Docker** (it builds the repo's `Dockerfile`),
  **Region: Frankfurt**, **Instance type: Free**.
- **Environment:** `PORT=8787`, the port the Dockerfile's server listens on.
- **Health check path:** `/healthz`.
- **Auto-deploy: off.** A deploy restarts the server, and a restart ends every room. Deploy by hand, never on an
  event day.
- **The free service sleeps after 15 minutes without traffic,** and the first visit after that wakes it (it can take
  up to a minute). Open the site about 10 minutes before the session, and don't leave a room idle in the lobby that
  long: a sleeping service loses its rooms like a restart does.
- **Upgrade path:** switching the same service to a paid instance type stops the sleeping; nothing else changes.
- **A custom subdomain** (e.g. `crew.example.org`): add it under the service's custom domains and point a `CNAME`
  record at the service's `onrender.com` address. Open the TV at that subdomain; the QR code uses it, so
  `PUBLIC_URL` isn't needed.

## Built with an AI coding agent
Quantum Crew was designed by a person and written almost entirely by Claude Code, in milestones (M0–M5), one branch
and one reviewed pull request per milestone. [`CLAUDE.md`](CLAUDE.md) is the agent's working memory: goal, layout,
decisions, rules for the Atlas API, and status. It is kept up to date as the game changes, so a fresh agent session
can pick the project up where the last one left off.

## Origin
Made for [Moth Hack 2026](https://hack.mothquantum.com) (11 FQxI Challenge) in the
[moth-hack-2026](https://github.com/WWStoryMode/moth-hack-2026/tree/main/apps/quantum-crew) monorepo and moved here as
a standalone repo. The hackathon submission record is in [`docs/moth-hack-2026/`](docs/moth-hack-2026/).

## License
Code: [MIT](LICENSE). The Atlas engine outputs in `src/assets/atlas/` and `atlas-src/` were generated on the
[Moth Quantum](https://platform.mothquantum.com) platform and follow its terms.
