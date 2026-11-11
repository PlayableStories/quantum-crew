# Running a Quantum Crew session

For whoever runs event mode: one TV or projector, two tables of players with a phone each, and you at the host
controls along the bottom of the TV (or on your own phone: [Using the remote](#using-the-remote); while it's paired
the TV hides its controls). Up to 12 players play: 6 pairs, at most 6 players per table; CORA, the AI crewmate,
fills any empty seat, and a 7th player at a table is turned away ("Table A is full"). A session takes about 50 minutes
for up to 8 players; for a full room of 12 allow **about 60 minutes** (an estimate, to confirm in a playtest). The
times below are for a smaller room.

**Larger groups talk longer in the lulls.** With five or six pairs, expect each lull to run a few minutes more: more
pairs to agree, and pairs compare notes across the table. Don't watch the clock; watch the ready count on the TV's
banner and the Start button (*"Start the wave (4 of 6 pairs ready)"*). When most pairs are ready and the rest have
had a fair go, start early on purpose (the second press).

Setting up the server: see [Run event mode at a venue](../README.md#run-event-mode-at-a-venue) in the README.

## Pre-flight checklist (30 minutes before)

- [ ] **No deploys on event days.** On a hosted server (Render, Fly…) a deploy restarts it and ends every room; turn
      auto-deploy off. On the free Render tier, open the site about 10 minutes early (it sleeps when idle), then keep
      the TV's `/screen` open and in front: while it's open it keeps the service awake.
- [ ] **Power** for the laptop, the router and the TV, and a charger for your own phone.
- [ ] **Network:** the laptop and the router are on, and the laptop is on the router's Wi-Fi (or cable). Venue Wi-Fi
      often stops phones reaching the laptop; your own travel router avoids that.
- [ ] **Server:** `pnpm build && pnpm start`. Note the "Phones join at:" address it prints (the one the QR code
      uses); any "Also on:" addresses are the laptop's others (VPN, Docker…).
- [ ] **Phone check:** on a phone on the same Wi-Fi, open `<that address>/healthz`. It should show `{"ok":true}`.
- [ ] **TV:** open `/screen` on the laptop and put it on the TV (mirror or extend). Read the room code and the link
      from the back of the room. If the TV shows the yellow warning ("Phones can't open this link"), see
      [Troubleshooting](#a-phone-cant-join).
- [ ] **A real join:** scan the QR with your phone, join Table A, and check your name appears on the TV. Then tap
      **Leave** (or join with the real players' names later; a test seat is harmless but shows on the TV).
- [ ] **Remote (optional):** press **Remote** at the top right of the TV, scan the code with your own phone, and
      check the TV's button turns green ("Remote ✓"). See [Using the remote](#using-the-remote).
- [ ] **Sound:** the TV plays a chime on good waves and an alarm on bad ones. Set the volume, or mute it with the
      speaker button at the top right.
- [ ] **Two tables** far enough apart that they can't overhear each other easily, each with a card saying "Table A" or
      "Table B".
- [ ] **A spare phone** (or two) for a guest without one.
- [ ] If the laptop sleeps, turn sleep off: a sleeping laptop drops every phone.

## Run of show

The host controls only work at the right moments; the others are greyed out. Playing straight after a talk on
quantum? See [Pairing the game with a talk on quantum](#pairing-the-game-with-a-talk-on-quantum).

| Time | What happens | You press |
| --- | --- | --- |
| 0:00 | **Lobby.** Players scan the QR (or open the link and type the code), enter a name and pick a table. The TV lists the pairs as they form. From the briefing on, the TV shows only a small **Join: CODE** at the top; click it (or press **J**) to show the QR for a late joiner. Each phone's header always names the phase, so nobody needs telling where to look. | nothing yet |
| 0:05 | **Briefing.** The TV shows Kestrel Station, the two tables, the coolant ring and its rule: pumps match, unless both sensors are HOT, then they must differ. Read it aloud. Phones show the quick rule. | **Start the night shift** |
| 0:07 | **Act I, the night shift.** Six rounds with the radio working: each phone shows the partner's reading and pump, and talking out loud is fine. A pump can change until the round ends; a round ends as soon as both pumps have settled, or when you press **Next** (the night shift starts paused; on Play it also ends when its time runs out). Every round is winnable. | **Start the rounds**, then **Next** (or ▶ Play) |
| 0:09 | **The storm.** It follows by itself: the radio breaks up mid-line on every phone, then the TV shows the storm log. Read it aloud: the waves will kill the radio. | nothing |
| 0:10 | **The lull.** The last chance to talk: each player picks one of four named plans and sees their partner's choice live. The lull isn't timed: the TV shows how long they've been talking. Each player taps **Ready** on their phone when their pair has agreed; the TV's pair cards show **Planning**, **Ada ready** or **✓ Ready**, and the button counts them (**Start the wave (3 of 4 pairs ready)**). **Wait for every pair to be ready**, then one press starts the wave. If a pair is stuck (2–3 minutes is plenty), start early on purpose: the first press asks **"1 pair still planning. Start anyway?"** and a second press within 5 s starts it; anyone not ready plays the plan they have selected. | **Use the lull**, then **Start the wave** (twice to start early) |
| 0:13 | **Act II's first wave, manual.** 8 rounds. The radio is down: phones show their own sensor, a **Plan locked** badge (a tap shows both plans) and two pump buttons, the plan's tagged. No talking between tables. Each round waits until every pair has chosen (the TV shows who is still choosing; **Next** closes the round if someone is stuck). The result stays up: read the cause aloud, then **Next**. About 3–4 minutes. Press **▶ Play** any time to let the rest run by itself. | **Next** (or Space / →) |
| 0:17 | **Wave passed.** The TV shows every pair's plans case by case and their true rate, and each phone shows its own pair's four cases. With five or six pairs the TV shows one row per pair instead: the true rate and the case the plan loses (*"loses HOT · HOT"*); the four cases are on the phones. Point at a ✗ case (or the "loses" case): that's the round the plan always loses. A "by luck" line means the wave beat 80% but the plan can't. Run one more lull and wave so they feel the ceiling; later waves play by themselves (Relaxed: 12 s to decide, 8 s per result). | **Use the lull**, then **Start the wave** |
| 0:18 | **Engineering report.** The plan board: every pairing of plans, exactly 75% or 25%. The crew's pairings are marked as tried; engineering ran the rest. No plan beats 75% ("the best plan loses one in four"). Read the prompt aloud: "Turn to your partner. Did you blame each other? It was never either of you." | **Reveal ceiling** |
| 0:19 | **The tool.** A supply pod brings two linked crystals for every pair, one at each table; engineering's note says they carry no messages, so the storm can't jam them. Read it aloud, then: *"The crystals don't replace your plan. They change what a plan can say."* Then read the crystals' rule aloud (it's not a clue; it stays up for the rest of Act III). The TV shows it in three lines: each crystal alone is a coin flip whatever its setting; linked crystals land the same way more often the closer their settings (the table: 0° 100%, 22.5° 85%, 45° 50%, 67.5° 15%, 90° 0%); followed crystals make the pumps match exactly when they give the same direction, so keep settings close in the three cases that need the same direction and far apart when both are HOT, which needs different directions. | **Unlock tool** |
| 0:20 | **Act III lull: the crystal plan.** Each phone has a plan card shaped like an Act II plan: a setting for COOL and one for HOT, picked from a list. The station measures the crystal at that setting; the player is the planner. The partner's plan shows live, with a fan of the pair's four settings and the gap in each case. The card's first line says it's like an Act II plan, with a crystal setting for each reading instead of a direction. **Clue 1 opens with this lull:** each phone shows the pair's live rate and hint (at 0°: 75%, both HOT needs the settings further apart; with CORA 67.7%), and it follows every setting change. The TV lists every pair's hint and the nudge, beside the rule, each with its ready state, and the question (*"How close can you keep three gaps while the fourth stays far apart?"*). Players tap **Ready** as in Act II; wait for every pair, or start early with the second press. | **Use the lull** |
| 0:21 | **Act III waves.** No MEASURE: the station measures each crystal at the player's planned setting when the round starts. Each phone shows one line, *"HOT → your plan: 45° → the crystal says …"*; the player sets the pump, following it or not (Enter follows). The suggested pump is tagged **Crystal**. The first wave is manual, later ones play by themselves. | **Start the wave**; **Next** in the manual wave |
| 0:23 | **Act III wave passed.** The TV shows every pair's crystal plans case by case (with five or six pairs, one row per pair; each phone shows its pair's four cases): each case's gap and its chance of holding, the true rate, **found it: 80%+** on pairs that got there, and a luck line where the wave and the true rate disagree. The top line says whether the crew's crystal plans average 80% (the station holds) and how often the crew followed the crystal. Pairs below 80% get their weakest case outlined with which way to move. Release **the answer** (Next clue) if pairs are still below 80%, or give a close room another lull first. | **Next clue**; **Use the lull**, then **Start the wave** |
| 0:28 | **The storm passes.** The station clears: calm if the crew saved it, damaged if not. Phones tell each player to tell their partner what they were thinking during the storm; give the room a minute to talk. | **The storm passes** |
| 0:30 | **Incident report.** Step through with Back / Next on the TV: the three numbers (with the radio, the best plan, the crystals), the best plan beside the crystals, why the crystals can't send a message (every pump ≈ 50%), then credits. Each phone shows its own pair's three numbers. | **Incident report**, then **Next** |
| 0:35 | Done. For a new group, **Reset** clears the scores and keeps the players (and goes back to the lobby, before the night shift); for a new crowd, open a fresh `/screen`. | **Reset** (asks to confirm) |

Short on time? From the lobby, **Use the lull** skips the night shift and the storm and starts Act II.

### Pacing: Play, Pause and Next
The host row on the TV shows only what you can do now, plus **▶ Play / ⏸ Pause**, a small **▾** for the speed, and
**Reset**. Every change takes effect at once, even in the middle of a round or a result. The keyboard works too:
**Space** or **→** for Next (Close the round, then Next round; Start the wave in a lull; Next in the report), **P** to
play or pause, **J** for the join QR (after the lobby), **M** to mute, **?** for the list of keys (or the **?** at the top), **F** for full screen (no browser frame; F or Esc leaves it; press it once the TV page is open, as
the browser needs a key press). **D** opens the debug jump (for testing only; don't use it with a real crew): **Jump to Act II
(lull)** or **Jump to Act III (tool reveal)**, outside a wave. It skips the story; what's been played is kept.
- **Pause = manual** (the default for each act's first wave, including the night shift): no countdown. A round
  closes when every pair has chosen, or when you press **Next** (anyone who hasn't chosen counts as too slow). The
  result stays on the TV and phones until you press **Next**. Use it to read each cause aloud and let people talk.
  Players can still answer while you're in manual.
- **Play = auto** (the default after that): rounds and results move on by themselves, and the button shows the
  seconds left (e.g. "⏸ 7 s"). **Next** still skips ahead. Press **⏸** whenever the room needs a moment.
- **Speed (▾ beside Play):** **Relaxed** (12 s to decide, 15 s in the night shift, 8 s per result) or **Brisk** (the
  original fast timers, 3.5 s rounds, for a crowd that already knows the game). The menu shows each one's seconds.
  Picking one also presses Play. Changing speed mid-round counts the time already spent (at least 2 s stay).
- Once you press Play or Pause, your choice holds for later waves (the defaults stop) until **Reset**.

### Using the remote
Your phone can run the session instead of the laptop, so you can walk between the tables.
- **Pair:** press **Remote** at the top right of the TV. A dialog shows a QR code; scan it with your phone (same Wi-Fi
  as the players). The page opens at `/host`, and the TV's button turns green ("Remote ✓"). Close the dialog with ✕
  or Escape. A reload or a locked screen re-pairs by itself.
- **The TV goes quiet:** while a remote is paired, the TV hides its host row and key hint, so the room sees only the
  game. The keyboard still works and a small **?** stays at the top. If the remote drops (or you unpair), the row
  comes back.
- **What's on it:** the phase and round at the top, then one big button for the natural next step (**Start the
  night shift**, **Start the rounds**, **Close the round**, **Next round**, **Start the wave**, Next in the report),
  the other steps that apply now below it, and **▶ Play / ⏸** with the **▾** speed menu, as on the TV. Under that,
  **Say** gives 1–3 talking points for the phase (from this guide), and **The room** shows who is still choosing in a
  round, each pair's cause on a result, and in a lull the talking clock and each pair's ready state (Say adds the
  count). Start the wave asks "Start anyway?" there too when pairs are still planning: press again to start. It never
  shows anyone's sensor or pump.
  **Reset the session** is at the bottom and asks first.
- **The TV's keys still work.** You and the TV's keyboard (or two facilitators' remotes) can press at the same time: the room moves on
  once, and the later press is ignored. **Next clue** works from both.
- **Unpair:** anyone with the remote's code can run the session. **Unpair remotes** in the same dialog makes a new
  code; paired phones show "This remote link has expired". After a server restart, scan again.

### The clue ladder (Act III)
Two clues. The crystals' rule isn't one: it's on the TV from the tool reveal on, and in each phone's **Crystal rule**
sheet. A clue never goes away until **Reset**, and the room keeps it, so a refreshed TV still shows it. Phones keep
the clues so far in their **Clues** sheet.

1. **The hint and the nudge** (automatic, when the first Act III lull opens). Each pair's hint comes from its
   plans as they are right now and follows every change: its weakest case, the gap, the chance and which settings to
   move ("bring A's COOL and B's HOT closer" for a same case, "Move your HOT settings further apart." for both HOT;
   with CORA, only the player's own setting moves). Pairs
   at 80%+ see **Found it**. Point the room at the TV's list and the nudge: *"The different gap can never be bigger than
   the three same gaps added together. You want the same gaps small and the different gap near 90°."* Then let them
   play wave 1: their own attempt.
2. **The answer** (Next clue, on the TV or the remote, only after an Act III wave; never automatic). The button says
   who still needs it (*"Next clue: the answer (2 pairs not yet at 80%)"*). If the room is close, you can hold it for
   another lull. The answer: spread the four settings evenly, 22.5° apart: A: COOL 0°, HOT 45°; B: COOL 22.5°, HOT
   157.5° (the same setting as −22.5°). Three same gaps of 22.5° (85% the same) and a different gap of 67.5° (85%
   different): 85.4%. Each phone shows its own row and, if the pair is below 80%, **Use these settings**; each
   partner applies their own. Wave 2 saves the station.

A double press (or the TV and the remote at once) releases it once. The remote's **Say** box shows the latest clue's talking points in Act III.

## Pairing the game with a talk on quantum
If the game follows a talk that introduces entanglement as spinning coins with random but perfectly correlated
outcomes, names the Bell tests (Aspect, Clauser, Zeilinger) and says entangled photons let distant stations "talk",
the game agrees on the coins and on Bell's inequality, and deliberately shows that entanglement carries no messages.
The players' screens already carry true, general versions of these points; the lines below tie them to the talk.
The remote's **Say** box has the short versions.

- **The tool reveal:** *"These crystals are the entangled coins from the talk."* (The pod's note on the TV and the
  phones says: each lands at random, but a linked pair measured at the same setting always lands the same way.)
- **The start of Act III (the first lull):** *"Your starting plan uses perfectly correlated coins, like the talk's
  example, and it scores exactly 75%, no better than an ordinary plan. So where does the advantage come from?"* (The
  TV asks the same in the first lull.) The answer is in the gaps: settings a little apart in three cases, far apart
  in the fourth.
- **The incident report, first step:** *"The inequality you couldn't beat in Act II is the one Clauser tested."* (The
  step names Clauser, Aspect and Zeilinger and their 2022 Nobel Prize.)
- **If the talk said entangled particles let stations "talk":** bridge it at the no-signalling step ("But no
  messages"). Entanglement gives both ends the same randomness, like a shared key; that is how quantum key
  distribution works, and the message itself still has to be sent the ordinary way. Each player's own pump was
  clockwise about half the time whatever their partner's sensor said, so nothing reached them through the crystals.

**For technical attendees:** the crystal settings behave like polarisation angles for photons (as in Aspect's
experiments), where 90° apart means opposite outcomes. On a Bloch sphere, opposite states are 180° apart, so the
game's angles are half the Bloch-sphere angles. It doesn't affect play.

## Troubleshooting

### A phone can't join
- **"No station with code …":** check the four letters on the TV (case doesn't matter).
- **The page doesn't load at all:** the phone can't reach the laptop.
  - Is the phone on the same Wi-Fi as the laptop (not mobile data, not the venue's guest network)?
  - If the lobby shows "Not working? Try: …", the laptop has other addresses (a VPN, Docker, a virtual machine).
    Click one: it becomes the QR code and the link (the TV remembers it). Try each until a phone gets in.
  - Open `<address>/healthz` on that phone. If that fails too, the network is isolating devices: use your own
    router, or the laptop's hotspot.
- **The TV shows the yellow warning** ("Phones can't open this link"): the TV page is open at `localhost` and the
  server found no network address. Connect the laptop to the Wi-Fi, restart the server **before** the session starts,
  and reload `/screen`, or open `/screen` at the printed network address. With a hostname, set `PUBLIC_URL`.
- **"Table A is full." / "Table B is full.":** each table takes 4. Ask them to join the other table, or wait for the next group.

### A phone dropped out, or a player left (locked screen, lost Wi-Fi, closed the tab, the ⋯ menu's Leave)
- **CORA covers their seat** straight away, so their partner keeps playing normally, and a manual round never waits
  for an absent phone. The TV and the partner's phone show "CORA (covering for …)".
- It reconnects by itself when the page comes back. If the tab was closed, open the link again and join with **the
  same name and the same table**: the player gets their seat back.
- While a player is away, their seat on the TV is dimmed and reads "CORA for …". A rejoin before CORA has moved
  gives them that round; otherwise they play on from the next round. In Act I a rejoin mid-round gets the round back as it was: their sensor, the partner's call and
  their own pump.
- Someone who joins during Act I's rounds or a wave is seated when it ends.

### The TV was refreshed (or the laptop's browser crashed)
- Reload `/screen` in the **same browser tab or window**: the TV resumes the same station, code and scores.
- Opening `/screen` somewhere else creates a **new** station with a new code; phones would have to join again.

### Never restart the server mid-session
Rooms live only in the server's memory. Stopping or restarting `pnpm start` (or letting the host machine sleep or
stop) ends every room: scores are lost and every phone has to join a new code. If it happens, open `/screen` again
and have everyone rejoin with the new code. A room nobody is connected to is cleared after 30 minutes.
