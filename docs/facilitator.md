# Running a Quantum Crew session

For whoever runs event mode: one TV or projector, two tables of players with a phone each, and you at the host
controls along the bottom of the TV. A session takes about 30 minutes for up to 8 players (4 pairs, at most 4
players per table; CORA, the AI crewmate, fills any empty seat).

Setting up the server: see [Run event mode at a venue](../README.md#run-event-mode-at-a-venue) in the README.

## Pre-flight checklist (30 minutes before)

- [ ] **Power** for the laptop, the router and the TV, and a charger for your own phone.
- [ ] **Network:** the laptop and the router are on, and the laptop is on the router's Wi-Fi (or cable). Venue Wi-Fi
      often stops phones reaching the laptop; your own travel router avoids that.
- [ ] **Server:** `pnpm build && pnpm start`. Note the "Phones join at:" address it prints.
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
| 0:05 | **Brief.** The station's coolant ring: each table runs one pump; when both sensors read HOT, the pumps must fight; otherwise they must agree. No talking between tables during a wave. | nothing |
| 0:07 | **Act II huddle.** Partners may talk across tables for 45 s and agree a plan. The wave starts when the clock runs out. | **Start huddle (45 s)** (or **Start batch** to cut it short) |
| 0:08 | **Act II wave.** 12 rounds, about a minute. Phones show only their own sensor and two pump buttons. | nothing (it runs itself) |
| 0:09 | **Wave done.** The TV shows how many rounds held. Run one or two more huddles and waves so they feel the ceiling. | **Start huddle (45 s)**, then waves again |
| 0:14 | **Engineering report.** No plan beats 75% ("the best plan loses one in four"). | **Reveal ceiling** |
| 0:16 | **The tool.** Every pair gets linked crystals. Phones show two dials, one for COOL and one for HOT. | **Unlock tool** |
| 0:17 | **Act III huddle.** Partners agree dial settings. If they're stuck after a wave, show the hint. | **Start huddle (45 s)**; **Show hint** if needed |
| 0:18 | **Act III waves.** Two or three waves; each round, phones show the sensor, the dial in use and MEASURE. The TV adds the 85.4% line. | **Start batch** / **Start huddle (45 s)** between waves |
| 0:24 | **Debrief.** Step through with Back / Next on the TV: the 75% wall, the 85.4% bound with the best dials, then why the crystals can't send a message (every row ≈ 50%), then credits. | **Debrief**, then **Next** |
| 0:30 | Done. For a new group, **Reset** clears the scores and keeps the players; for a new crowd, open a fresh `/screen`. | **Reset** (asks to confirm) |

## Troubleshooting

### A phone can't join
- **"No station with code …":** check the four letters on the TV (case doesn't matter).
- **The page doesn't load at all:** the phone can't reach the laptop.
  - Is the phone on the same Wi-Fi as the laptop (not mobile data, not the venue's guest network)?
  - Open `<address>/healthz` on that phone. If that fails too, the network is isolating devices: use your own
    router, or the laptop's hotspot.
- **The TV shows the yellow warning** ("Phones can't open this link"): the TV page is open at `localhost` and the
  server found no network address. Connect the laptop to the Wi-Fi, restart the server **before** the session starts,
  and reload `/screen`, or open `/screen` at the printed network address. With a hostname, set `PUBLIC_URL`.
- **"Table A is full." / "Table B is full.":** each table takes 4. Ask them to join the other table, or wait for the next group.

### A phone dropped out (locked screen, lost Wi-Fi, closed the tab)
- It reconnects by itself when the page comes back. If the tab was closed, open the link again and join with **the
  same name and the same table**: the player gets their seat back.
- While a player is away, their seat on the TV is dimmed and their rounds time out. A rejoin mid-wave plays on from
  the next round.

### The TV was refreshed (or the laptop's browser crashed)
- Reload `/screen` in the **same browser tab or window**: the TV resumes the same station, code and scores.
- Opening `/screen` somewhere else creates a **new** station with a new code; phones would have to join again.

### Never restart the server mid-session
Rooms live only in the server's memory. Stopping or restarting `pnpm start` (or letting the host machine sleep or
stop) ends every room: scores are lost and every phone has to join a new code. If it happens, open `/screen` again
and have everyone rejoin with the new code. A room nobody is connected to is cleared after 30 minutes.
