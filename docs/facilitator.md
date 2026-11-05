# Running a Quantum Crew session

For whoever runs event mode: one TV or projector, two tables of players with a phone each, and you at the host
controls along the bottom of the TV. A session takes about 50 minutes for up to 8 players (4 pairs, at most 4
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
| 0:13 | **Act II's first wave, Guided.** 8 rounds. The radio is down: phones show their own sensor, both locked plans and two pump buttons. No talking between tables. Each round waits until every pair has chosen (the TV shows who is still choosing; **Close the round** if someone is stuck). The result stays up: read the cause aloud, then **Next round**. About 3–4 minutes. | **Close the round** if needed, **Next round** (or Space / →) |
| 0:17 | **Wave passed.** The TV shows every pair's plans case by case and their true rate. Point at a ✗ case: that's the round the plan always loses. A "by luck" line means the wave beat 80% but the plan can't. Run one more lull and wave so they feel the ceiling; later waves are Relaxed (12 s to decide, 8 s per result, running by themselves). | **Use the lull**, then **Start the wave** |
| 0:18 | **Engineering report.** The plan board: every pairing of plans, exactly 75% or 25%. The crew's pairings are marked as tried; engineering ran the rest. No plan beats 75% ("the best plan loses one in four"). Read the prompt aloud: "Turn to your partner. Did you blame each other? It was never either of you." | **Reveal ceiling** |
| 0:19 | **The tool.** A supply pod brings every pair linked crystals; engineering's note says they carry no messages, so the storm can't jam them. Read it aloud. Phones explain how the tool behaves. | **Unlock tool** |
| 0:20 | **Act III lull.** Each player sets two dials (COOL and HOT) and sees their partner's live. If they're stuck after a wave, show the hint. | **Use the lull**; **Show hint** if needed |
| 0:21 | **Act III waves.** Tap MEASURE, the crystal suggests a pump, then set the pump (following it or not). The first wave is Guided (as in Act II), later ones Relaxed. | **Start the wave**; **Close the round** / **Next round** in the Guided wave; **Use the lull** between waves |
| 0:23 | **Act III wave passed.** The TV shows every pair's dials case by case and their true rate; pairs at 80% or more glow green. The top line says whether the crew's dials average 80% (the station holds) and how often the crew followed the crystal. Play another lull and wave if it says "Not yet". | **Use the lull**, then **Start the wave** |
| 0:28 | **The storm passes.** The station clears: calm if the crew saved it, damaged if not. Phones tell each player to tell their partner what they were thinking during the storm; give the room a minute to talk. | **The storm passes** |
| 0:30 | **Incident report.** Step through with Back / Next on the TV: the three numbers (with the radio, the best plan, the crystals), the best plan beside the crystals, why the crystals can't send a message (every pump ≈ 50%), then credits. Each phone shows its own pair's three numbers. | **Incident report**, then **Next** |
| 0:35 | Done. For a new group, **Reset** clears the scores and keeps the players (and goes back to the lobby, before the night shift); for a new crowd, open a fresh `/screen`. | **Reset** (asks to confirm) |

Short on time? From the lobby, **Use the lull** skips the night shift and the storm and starts Act II.

### Pacing: Guided, Relaxed, Brisk
The host row on the TV shows only what you can do now, plus **Pause**, the pace and **Reset**. The keyboard works too:
**Space** or **→** for the next step (Close the round, then Next round; Start the wave in a lull; Next in the report),
**P** to pause and resume.
- **Guided** (the default for each act's first wave, including the night shift): no countdown. A round closes when
  every pair has chosen, or when you press **Close the round** (anyone who hasn't chosen counts as too slow). The
  result stays on the TV and phones until you press **Next round**. Use it to read each cause aloud and let people
  talk about it.
- **Relaxed** (the default after that): rounds run by themselves with generous timers (12 s to decide, 15 s in the
  night shift, 8 s on each result).
- **Brisk:** the original fast timers (3.5 s rounds), for a crowd that already knows the game.
- Changing the pace takes effect from the next round and overrides the default until you change it again.
- **Pause** freezes whatever is counting down, for the whole room; phones say the game is paused. **Resume** carries
  on with the time that was left.

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
- **CORA covers their seat** straight away, so their partner keeps playing normally, and a Guided round never waits
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
