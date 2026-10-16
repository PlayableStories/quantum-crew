// All player-facing text in one place. Edit freely.
// In-world copy only, up to the debrief: physics words (qubit, Bell, CHSH…) appear only in `debrief`.
import { ROUND_MS } from "./config.ts";

export const S = {
  title: "Quantum Crew",
  rule: {
    head: "Station rule",
    body: "Keep the coolant flowing one way round the ring. If BOTH sections run HOT, pump against each other to purge.",
    vent: "The relief vent between the sections unlocks only when BOTH sensors read HOT. Nobody can see whether it's unlocked.",
    quick: "Quick rule: pumps MATCH, unless both sensors are HOT. Then they must DIFFER.",
  },
  light: { 0: "COOL", 1: "HOT" } as const,
  pump: { 0: "CLOCKWISE", 1: "ANTICLOCKWISE" } as const,

  ring: {
    label:
      "The coolant ring: Section A and Section B each have a pump that runs clockwise or anticlockwise. A relief vent between them unlocks only when both sections are HOT.",
    a: "A · you",
    b: "B · crewmate",
    vent: "Vent",
    ventNote: "unlocks only when BOTH are HOT",
  },

  landing: {
    tagline: "Keep the station alive. Some problems no plan can solve.",
    solo: "Solo demo",
    soloSub: "You and an AI crewmate · about 6 minutes",
    host: "Host on TV",
    hostSub: "Event mode: open this on the big screen",
    join: "Join with code",
    joinSub: "Event mode: on your phone",
    credits: "Credits",
  },

  intro: {
    kicker: "Station log · shift 1",
    lines: [
      "The station's coolant runs round a ring that passes through two sections. You are at Table A and run your section's pump. Your crewmate, an AI, runs the pump at Table B.",
      "The reactor flares at random. Each round your sensor reads COOL or HOT: you can't predict it, and you can't see your crewmate's.",
      `You each set your pump: CLOCKWISE or ANTICLOCKWISE. No talking between sections during a round. You have ${ROUND_MS / 1000} seconds.`,
    ],
    survival: "The station needs 80% stability. The core can take one bad round in five, and no more.",
    go: "Take your post",
  },

  plan: {
    kicker: "Strategy huddle",
    title: "Agree a plan",
    crewmate: "Your crewmate radios in: “I always pump clockwise. Standard procedure.”",
    blind: "You can't see their sensor. They can't see yours.",
    whenCool: "When my sensor reads COOL",
    whenHot: "When my sensor reads HOT",
    start: (n: number) => `Start batch ${n}`,
    last: (pct: string) => `Last batch: ${pct} stable`,
  },

  batch: {
    label: (n: number) => `Batch ${n}`,
    round: (n: number, total: number) => `Round ${n}/${total}`,
    incoming: "Sensors warming up…",
    yourLight: "Your sensor",
    planTag: "Plan",
    measure: "Measure",
    stable: "Stable",
    leak: "Leak",
    slow: "Too slow",
    you: "You",
    crewmate: "Crewmate",
  },

  /** Solo round results: what physically happened (see roundCause in shared/fiction.ts). */
  outcome: {
    circulate: { title: "Circulating", line: "Both sections COOL and the pumps agree: coolant flows round the ring." },
    carry: { title: "Heat carried off", line: "One section HOT and the pumps agree: circulation carries the heat to the cool side." },
    spike: {
      title: "Pressure spike",
      line: "Both sections COOL and the pumps fought: the vent is locked, so pressure spiked.",
      lineHot: "One section HOT and the pumps fought: the vent stays locked unless BOTH sections are HOT, so pressure spiked.",
    },
    overheat: { title: "Overheat", line: "Both sections HOT and the pumps agree: hot coolant just goes round in circles and the core cooks." },
    purge: { title: "Purge", line: "Both sections HOT, so the vent unlocked, and the opposed pumps forced the hot coolant out." },
    slow: { title: "Too slow", line: "Your pump wasn't set in time, so the round is lost." },
  },

  readout: {
    kicker: (n: number) => `Batch ${n} complete`,
    held: (wins: number, total: number) => `${wins} of ${total} rounds held`,
    stability: "Station stability",
    actSoFar: (n: number) => `All ${n} rounds this shift`,
    simulate: "Run 1,000 rounds",
    simulateSub2: "Test your plan against 1,000 more sensor readings",
    simulateSub3: "Test your tool settings against 1,000 more sensor readings",
    simLabel: "1,000-round test",
    simResult: (pct: string) => `1,000-round test: ${pct}`,
    again2: "Back to the huddle",
    again3: "Retune and go again",
    report: "Call engineering",
    debrief: "Debrief",
  },

  meter: {
    survival: "Survival 80",
    ceiling: "Ceiling 75",
    limit: "Limit 85.4",
    empty: "No data",
  },

  ceiling: {
    kicker: "Engineering report",
    big: "75%",
    lines: [
      "We tried every plan your crew could make. Every single one.",
      "None of them holds more than 75% of rounds: the best plan loses one in four. Not on average, not ever.",
      "The core can take one bad round in five. The station needs 80%.",
    ],
    go: "Then we need something that isn't a plan",
  },

  tool: {
    kicker: "Incoming cargo",
    title: "The Entanglement Tool",
    lines: [
      "Two linked crystals have arrived. One sits in your tool. The other is in your crewmate's tool at Table B.",
      "Turn the dial. Tap MEASURE. The crystal decides your pump: CLOCKWISE or ANTICLOCKWISE.",
      "Your crewmate has already tuned theirs. Set one dial for COOL and one for HOT, and find what holds.",
    ],
    go: "Pick up the tool",
  },

  tuning: {
    kicker: "Tool tuning",
    title: "Tune your dials",
    crewmate: "Your crewmate's tool is tuned. You can't see their dials.",
    hintButton: "Ask engineering for a hint",
    hint: "Try making your two dials 45° apart, and your partner's offset by half that.",
    start: (n: number) => `Start batch ${n}`,
  },

  dial: { prev: "Turn dial left", next: "Turn dial right" },

  debrief: {
    kicker: "Debrief",
    next: "Next",
    back: "Back",
    again: "Play again",
    table: (t: string) => `Table ${t} (best setting)`,
    home: "Home",
    steps: [
      {
        title: "No plan beats 75%",
        body: [
          "Under the station is the CHSH game (Clauser, Horne, Shimony and Holt, 1969). The sensors are its random input bits x, y (COOL = 0, HOT = 1), the pumps its output bits a, b (CLOCKWISE = 0, ANTICLOCKWISE = 1), and “match unless both HOT” is its rule: a ⊕ b = x ∧ y. The vent is the story for the flipped case.",
          "The wall you hit in Act II is a Bell inequality. Two players who can't talk, with any plan agreed in advance (even a random one), win at most 75% of rounds.",
        ],
        stat: (pct: string) => `Your Act II rounds: ${pct}`,
      },
      {
        title: "Entanglement broke through",
        body: [
          "The two crystals were a pair of entangled qubits. Measured at dial angles θA and θB, your two pumps agree with probability cos²(θA − θB).",
          "With dials 45° apart and your partner's offset by half that (A: 0° and 45°; B: 22.5° and −22.5°, shown as 157.5°), a crew wins cos²(22.5°) ≈ 85.4% of rounds. No quantum strategy does better: this is the Tsirelson bound.",
          "Real experiments have broken the 75% wall with entangled photons; that work won the 2022 Nobel Prize in Physics.",
        ],
        stat: (pct: string) => `Your best 1,000-round test: ${pct}`,
      },
      {
        title: "But no messages",
        body: [
          "Your own pump ran clockwise about half the time, whether your crewmate's section was COOL or HOT. So you can't read their sensor from your result, and the tool can't carry a message.",
          "Only the correlation between your two results changed. That is what no-signalling means.",
        ],
      },
      {
        title: "Credits",
        body: [],
      },
    ],
    panel: {
      head: (n: string) => `Your tool settings, ${n} test rounds`,
      yourRounds: (n: number, cool: string, hot: string) =>
        `In your ${n} real Act III rounds your pump ran clockwise ${cool} of the time when your crewmate's section was COOL, and ${hot} when it was HOT. Few rounds means more noise; the 10,000 above settle it.`,
      row: (who: string, light: string) => `${who}: clockwise when partner's side was ${light}`,
      you: "You",
      crewmate: "Crewmate",
    },
  },

  sound: { mute: "Mute sound", unmute: "Turn sound on" },

  poster: {
    kicker: "A co-op party game · FQxI Challenge · Moth Hack 2026",
    tagline: "Two tables. No talking. A wall no plan can beat, until the crystals arrive.",
    classical: "Best any plan can do. The station needs 80%.",
    quantum: "With shared entanglement, and still no messages.",
    foot: "Play the CHSH game: feel the Bell limit, then break it.",
    engines: "Moth Quantum Atlas: Entanglement Shader (live) · Quantum Blur",
  },

  credits: {
    title: "Credits",
    lead: "Made for Moth Hack 2026 (FQxI Challenge) with Moth Quantum Atlas engines.",
    simulated:
      "The entangled pair in the game is simulated in your browser with the exact quantum probabilities. The station art, the tool reveal and the sounds come from Atlas engines.",
    assets: "Atlas assets",
    pending: "placeholder until the asset is added",
    job: (id: string) => `Atlas job ${id}`,
    learn: "Learn more: the CHSH game on IBM Quantum Learning",
    learnUrl:
      "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action/chsh-game",
    back: "Back",
  },

  event: {
    unavailable: "Event mode needs the station server. This copy of the game is solo only.",
    connecting: "Connecting to the station…",
    reconnecting: "Signal lost. Reconnecting…",
    table: (t: string) => `Table ${t}`,
    you: "you",
  },

  tv: {
    station: (code: string) => `Station ${code}`,
    join: "Join on your phone",
    joinAt: (url: string) => `or open ${url}`,
    code: "Code",
    noPlayers: "Nobody aboard yet.",
    phase: {
      lobby: "Scan to join. Pick Table A or Table B.",
      strategy: "Strategy huddle: talk to your partner now",
      round: "Comms blackout: no talking between tables",
      roundResult: "Comms blackout: no talking between tables",
      batchDone: "Batch complete",
      ceiling: "Engineering report",
      tool: "The Entanglement Tool",
      debrief: "Debrief",
    },
    batchHeld: (pct: string) => `${pct} of rounds held`,
    roundOf: (batch: number, round: number, size: number) => `Batch ${batch} · round ${round}/${size}`,
    pooled: "Station stability · last 48 rounds",
    allTime: (act: number, pct: string, n: number) => `Act ${act === 2 ? "II" : "III"} so far: ${pct} of ${n} rounds`,
    timeouts: (n: number) => `${n} too slow`,
    pair: (id: number) => `Pair ${id}`,
    controls: "Host controls",
    cmd: {
      startStrategy: "Start huddle (45 s)",
      startBatch: "Start batch",
      revealCeiling: "Reveal ceiling",
      unlockTool: "Unlock tool",
      debrief: "Debrief",
      reset: "Reset",
    },
    resetConfirm: "Reset the session? Scores are cleared; players stay.",
    toolLines: [
      "Two linked crystals for every pair: one in each partner's tool, one at each table.",
      "Turn the dial. Tap MEASURE. The crystal decides your pump: CLOCKWISE or ANTICLOCKWISE.",
      "Each of you sets one dial for COOL and one for HOT. Use the huddle to work out what holds.",
    ],
    showHint: "Show hint",
    hideHint: "Hide hint",
    crewAct: (act: number, pct: string, n: number) => `Your crew in Act ${act === 2 ? "II" : "III"}: ${pct} of ${n} rounds`,
    wholeCrew: "Whole crew",
    wobble: "A few rounds each makes the numbers wobble. Over many rounds every row settles at 50%, whatever the partner's sensor read.",
    marginalHead: {
      player: "Crew member",
      cool: "Clockwise when partner's side was COOL",
      hot: "Clockwise when partner's side was HOT",
      rounds: "Rounds",
    },
  },

  phone: {
    title: "Join the crew",
    code: "Station code",
    name: "Your name",
    pickTable: "Your table",
    join: "Board the station",
    seat: (table: string, name: string) => `Table ${table} · ${name}`,
    partner: (name: string, table: string) => `Partner: ${name} (Table ${table})`,
    lobby: "You're aboard. Eyes on the big screen.",
    waitingSeat: "You'll get a partner after this batch.",
    huddle: "Strategy huddle",
    huddleBody: "Talk to your partner now. Agree what you'll each do. When the clock runs out, comms go dark.",
    huddleBody3: "Talk to your partner now. Agree how you'll each set your dials. When the clock runs out, comms go dark.",
    tuneNow: "Set one dial for COOL and one for HOT. Your partner sets theirs. Work out together what holds.",
    retune: "Retune your dials",
    plan: "Your plan",
    pumpSet: (v: string) => `Pump set: ${v}. Hold…`,
    watch: "Eyes on the big screen.",
    leave: "Leave",
  },
};
