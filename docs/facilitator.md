# Running a Quantum Crew session

For whoever runs event mode: one TV or projector, two tables of players with a phone each, and you at the host
controls along the bottom of the TV (or on your own phone: [Using the remote](#using-the-remote)). A session takes about 50 minutes for up to 8 players (4 pairs, at most 4
players per table; CORA, the AI crewmate, fills any empty seat).

Setting up the server: see [Run event mode at a venue](../README.md#run-event-mode-at-a-venue) in the README.

## Pre-flight checklist (30 minutes before)

- [ ] **No deploys on event days.** On a hosted server (Render, Fly…) a deploy restarts it and ends every room; turn
      auto-deploy off. On the free Render tier, open the site about 10 minutes early (it sleeps when idle).
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

The host controls only work at the right moments; the others are greyed out.

| Time | What happens | You press |
| --- | --- | --- |
| 0:00 | **Lobby.** Players scan the QR (or open the link and type the code), enter a name and pick a table. The TV lists the pairs as they form. | nothing yet |
| 0:05 | **Briefing.** The TV shows Kestrel Station, the two tables, the coolant ring and its rule: pumps match, unless both sensors are HOT, then they must differ. Read it aloud. Phones show the quick rule. | **Start the night shift** |
| 0:07 | **Act I, the night shift.** Six rounds with the radio working: each phone shows the partner's reading and pump, and talking out loud is fine. A pump can change until the round ends; a round ends after 8 s, or as soon as both pumps have settled. Every round is winnable. | **Start the rounds** (then it runs itself) |
| 0:09 | **The storm.** It follows by itself: the radio breaks up mid-line on every phone, then the TV shows the storm log. Read it aloud: the waves will kill the radio. | nothing |
| 0:10 | **The lull.** The last chance to talk: each player picks one of four named plans and sees their partner's choice live. The lull isn't timed: the TV shows how long they've been talking. Start the wave when the room is ready (2–3 minutes is plenty). | **Use the lull**, then **Start the wave** |
| 0:13 | **Act II's first wave, manual.** 8 rounds. The radio is down: phones show their own sensor, both locked plans and two pump buttons. No talking between tables. Each round waits until every pair has chosen (the TV shows who is still choosing; **Next** closes the round if someone is stuck). The result stays up: read the cause aloud, then **Next**. About 3–4 minutes. Press **▶ Play** any time to let the rest run by itself. | **Next** (or Space / →) |
| 0:17 | **Wave passed.** The TV shows every pair's plans case by case and their true rate. Point at a ✗ case: that's the round the plan always loses. A "by luck" line means the wave beat 80% but the plan can't. Run one more lull and wave so they feel the ceiling; later waves play by themselves (Relaxed: 12 s to decide, 8 s per result). | **Use the lull**, then **Start the wave** |
| 0:18 | **Engineering report.** The plan board: every pairing of plans, exactly 75% or 25%. The crew's pairings are marked as tried; engineering ran the rest. No plan beats 75% ("the best plan loses one in four"). Read the prompt aloud: "Turn to your partner. Did you blame each other? It was never either of you." | **Reveal ceiling** |
| 0:19 | **The tool.** A supply pod brings two linked crystals for every pair, one at each table; engineering's note says they carry no messages, so the storm can't jam them. Read it aloud, then: *"The crystals don't replace your plan. They change what a plan can say."* **Clue 1** comes with it: the TV shows the crystals' rule in three lines: each crystal alone is a coin flip whatever its setting; linked crystals land the same way more often the closer their settings (the table: 0° 100%, 22.5° 85%, 45° 50%, 67.5° 15%, 90° 0%); followed crystals make the pumps match exactly when they agree, so keep three gaps close and both HOT far apart. | **Unlock tool** |
| 0:20 | **Act III lull: the crystal plan.** Each phone has a plan card shaped like an Act II plan: a setting for COOL and one for HOT, picked from a list. The station measures the crystal at that setting; the player is the planner. The partner's plan shows live, with a fan of the pair's four settings and the gap in each case. The card's first line says it's like an Act II plan, with a crystal setting for each reading instead of a direction, and a starting line says where they are: two players at 0° match in every case, 75%, just like their best Act II plan (with CORA: 67.7%, and an invitation to beat it). The TV shows the rule, the clues so far and the question (*"How close can you keep three gaps while the fourth stays far apart?"*). | **Use the lull** |
| 0:21 | **Act III waves.** No MEASURE: the station measures each crystal at the player's planned setting when the round starts. Each phone shows *"Your sensor → your plan → the crystal says …"*; the player sets the pump, following it or not (Enter follows). Plans are stamped **Plan locked** (as in Act II). The first wave is manual, later ones play by themselves. | **Start the wave**; **Next** in the manual wave |
| 0:23 | **Act III wave passed.** The TV shows every pair's crystal plans case by case: each case's gap and its chance of holding, the true rate, **found it: 80%+** on pairs that got there, and a luck line where the wave and the true rate disagree. The top line says whether the crew's crystal plans average 80% (the station holds) and how often the crew followed the crystal. Release the next clue when they're stuck (see below), then play another lull and wave. | **Next clue**; **Use the lull**, then **Start the wave** |
| 0:28 | **The storm passes.** The station clears: calm if the crew saved it, damaged if not. Phones tell each player to tell their partner what they were thinking during the storm; give the room a minute to talk. | **The storm passes** |
| 0:30 | **Incident report.** Step through with Back / Next on the TV: the three numbers (with the radio, the best plan, the crystals), the best plan beside the crystals, why the crystals can't send a message (every pump ≈ 50%), then credits. Each phone shows its own pair's three numbers. | **Incident report**, then **Next** |
| 0:35 | Done. For a new group, **Reset** clears the scores and keeps the players (and goes back to the lobby, before the night shift); for a new crowd, open a fresh `/screen`. | **Reset** (asks to confirm) |

Short on time? From the lobby, **Use the lull** skips the night shift and the storm and starts Act II.

### Pacing: Play, Pause and Next
The host row on the TV shows only what you can do now, plus **▶ Play / ⏸ Pause**, a small **▾** for the speed, and
**Reset**. Every change takes effect at once, even in the middle of a round or a result. The keyboard works too:
**Space** or **→** for Next (Close the round, then Next round; Start the wave in a lull; Next in the report), **P** to
play or pause. **D** opens the debug jump (for testing only; don't use it with a real crew): **Jump to Act II
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
- **What's on it:** the phase and round at the top, then one big button for the natural next step (**Start the
  night shift**, **Start the rounds**, **Close the round**, **Next round**, **Start the wave**, Next in the report),
  the other steps that apply now below it, and **▶ Play / ⏸** with the **▾** speed menu, as on the TV. Under that,
  **Say** gives 1–3 talking points for the phase (from this guide), and **The room** shows who is still choosing in a
  round, each pair's cause on a result, and the talking clock in a lull. It never shows anyone's sensor or pump.
  **Reset the session** is at the bottom and asks first.
- **The TV still works.** You and the TV (or two facilitators' remotes) can press at the same time: the room moves on
  once, and the later press is ignored. **Next clue** works from both.
- **Unpair:** anyone with the remote's code can run the session. **Unpair remotes** in the same dialog makes a new
  code; paired phones show "This remote link has expired". After a server restart, scan again.

### The clue ladder (Act III)
**Next clue** (on the TV's host row and the remote, labelled with the clue it releases) gives one clue at a time. A
clue never goes away until **Reset**, and the room keeps it, so a refreshed TV still shows it. Every clue so far stays
on the TV (the latest in full) and in each phone's **Clues** sheet. A double press (or the TV and the remote at once)
releases one clue.

1. **The crystals' rule** (automatic, with the tool). Say: *"Each crystal alone is a coin flip, whatever its
   setting. A gap of 0° always lands the same way, 90° never does. Followed crystals make matching pumps exactly when
   they agree."* The TV keeps the rule up in every Act III lull.
2. **A hint** (only after an Act III wave). The button says how many pairs aren't at 80% yet (*"Next clue: a hint
   (2 pairs not yet)"*). Those pairs see their weakest case on their phones and their TV card: its gap, its chance
   and which way to move (closer for a match case, further apart for both HOT). Pairs at 80%+ see **Found it**.
   Say: *"What does that case need?"*
3. **A nudge.** *"Going around your four settings, the differ gap can never be bigger than the three match gaps
   added together. You want the match gaps small and the differ gap near 90°. How would you spread them?"* (If the
   three match gaps are equal and the differ gap is as big as it can be, it's three times one match gap: three gaps
   of 22.5° make 67.5°.)
4. **The answer.** Spread the four settings evenly, 22.5° apart: A: COOL 0°, HOT 45°; B: COOL 22.5°, HOT 157.5° (the
   same setting as −22.5°). The three match gaps are 22.5° (85% the same) and the differ gap is 67.5° (85%
   different): 85.4%, which saves the station.

The remote's **Say** box shows the latest clue's talking points in Act III.

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
