// All player-facing text in one place. Edit freely.
// In-world copy only, up to the debrief: physics words (qubit, Bell, CHSH…) appear only in `debrief`.
import { ACT1_ROUND_MS, ACT1_ROUNDS } from "./config.ts";
import type { ClassicalStrategy, RoundResult } from "./shared/chsh.ts";
import { HOT, roundCause } from "./shared/fiction.ts";

/** The AI crewmate's name: CORA, the Coolant Ring Assistant. Solo radio lines, and event mode's bot seats (server). */
export const CREW_NAME = "CORA";

/** The station's name in the solo story. PLACEHOLDER: may change. Always "station", never "ship". */
export const STATION_NAME = "Kestrel Station";

/** Act I: how CORA calls her reading over the radio. */
const CORA_READING = { 0: "Cool here.", 1: "Hot here!" } as const;

export const S = {
  title: "Quantum Crew",
  rule: {
    head: "Station rule",
    body: "Keep the coolant flowing one way round the ring. If BOTH sections run HOT, pump against each other to purge.",
    vent: "The relief vent between the sections unlocks only when BOTH sensors read HOT. Nobody can see whether it's unlocked.",
    quick: "Quick rule: pumps MATCH, unless both sensors are HOT. Then they must DIFFER.",
    explain: "Explain",
  },
  sheet: { close: "Close" },
  light: { 0: "COOL", 1: "HOT" } as const,
  pump: { 0: "CLOCKWISE", 1: "ANTICLOCKWISE" } as const,
  pumpShort: { 0: "CW", 1: "ACW" } as const,

  ring: {
    label:
      "The coolant ring: Section A and Section B each have a pump that runs clockwise or anticlockwise. A relief vent between them unlocks only when both sections are HOT.",
    a: "A · you",
    b: `B · ${CREW_NAME}`,
    vent: "Vent",
    ventNote: "unlocks only when BOTH are HOT",
    ventOpen: "Vent unlocked",
    ventLocked: "Vent locked",
    notSet: "NOT SET",
  },

  landing: {
    tagline: `Keep ${STATION_NAME} alive through a solar storm.`,
    solo: "Solo demo",
    soloSub: `A night shift with ${CREW_NAME}, the station's AI · about 7 minutes`,
    host: "Host on TV",
    hostSub: "Event mode: open this on the big screen",
    join: "Join with code",
    joinSub: "Event mode: on your phone",
    credits: "Credits",
  },

  /** Solo intro: the background (step 1), then the night's routine and the rule (step 2). */
  intro: {
    kicker: `Station log · ${STATION_NAME}`,
    lines: [
      `${STATION_NAME} drifts on the edge of a young, restless star: a research platform powered by a reactor core, cooled by a coolant ring that runs through its two sections.`,
      `You keep the night shift at Table A. Table B is run by ${CREW_NAME}, the station's Coolant Ring Assistant: an AI, not a person, who has kept the ring running for years and trusts procedure above everything. Engineering works from the supply deck at the far end of the station.`,
      "When the star flares, one section or the other heats up without warning. On a quiet night that's routine: you call your readings over the radio and keep the pumps in step.",
    ],
    routineKicker: "Tonight's routine",
    routine: `Each round your sensor reads COOL or HOT. You and ${CREW_NAME} call your readings over the radio, then each set your pump within ${ACT1_ROUND_MS / 1000} seconds.`,
    survival: "The station needs 80% stability. The core can take one bad round in five, and no more.",
    go: "Start the night shift",
    next: "Next",
    back: "Back",
  },

  /** Solo: the huddle is the lull between storm waves. */
  plan: {
    kicker: "The lull",
    title: "Last chance to talk",
    sub: "Lock in a plan before the next wave hits. Once it hits, the radio goes dark until it passes.",
    you: "You",
    /** The two dialogue boxes: whose plan each one sets. */
    box: (who: string) => `${who}'s plan`,
    yourBox: "Your plan",
    lock: "Lock in the plan",
    lockSub: (n: number) => `Wave ${n} · radio goes dark`,
    last: (pct: string) => `Last wave: ${pct} stable`,
  },

  /** The four Act II plans, in chsh.ts's CLASSICAL_STRATEGIES order. */
  plans: {
    name: ["Always clockwise", "Reverse when HOT", "Reverse when COOL", "Always anticlockwise"],
    short: ["Always CW", "Rev. HOT", "Rev. COOL", "Always ACW"],
    detail: [
      "COOL: clockwise · HOT: clockwise",
      "COOL: clockwise · HOT: anticlockwise",
      "COOL: anticlockwise · HOT: clockwise",
      "COOL: anticlockwise · HOT: anticlockwise",
    ],
  },

  board: {
    head: "Plan board · 1,000-round tests",
    headExact: "Plan board · exact rates",
    rows: "You",
    cols: "Crew",
    legendExact: "Exact rates. Corner mark: engineering ran it.",
    cell: (you: string, crew: string, value: string) => `You ${you}, crewmate ${crew}: ${value}`,
    untested: "not tried",
    exact: (pct: string) => `exactly ${pct}`,
    tried: "you tried it",
    engRun: "run by engineering",
  },

  /** Solo: the radio works between storm waves, and goes down during one. */
  comms: {
    radio: "Radio",
    dark: "Storm wave · radio down",
    darkSub: "It may come back when the wave passes.",
  },

  /** The station's automatic log after each round: one impersonal sentence on why it held or failed. The ring shows
   *  both sensors and both pumps. */
  telemetry: {
    head: "Station telemetry",
    why: (r: RoundResult) =>
      ({
        circulate: "Both sections COOL and the pumps matched, so the coolant circulated.",
        carry: "One section HOT and the pumps matched, so the heat was carried to the cool side.",
        purge: "Both sections HOT and the pumps fought, so the vent opened and purged the heat.",
        spike: "The pumps fought, but the vent stays locked unless both sections are HOT.",
        overheat: "Both sections HOT and the pumps matched, so nothing pushed the heat out of the open vent.",
        slow: r.a === null ? "Your pump wasn't set in time." : `${CREW_NAME}'s pump wasn't set in time.`,
      })[roundCause(r)],
  },

  /** Act I: the night shift, radio working. */
  act1: {
    label: "Night shift",
    round: (n: number) => `Round ${n}/${ACT1_ROUNDS}`,
    ruleLine: "Both readings on the radio: match CORA's pump, unless both sections are HOT. Then reverse to purge.",
  },

  /** The storm: the radio breaks up, then the station log. Solo only. */
  storm: {
    kicker: "Night shift · radio",
    title: "Static",
    next: "Check the station log",
    logKicker: `Station log · ${STATION_NAME}`,
    logTitle: "Solar storm",
    log: [
      "A solar storm is coming off the star, and it's arriving in waves.",
      "Each wave heats the sections at random and drowns the radio. The radio won't survive the waves; it may come back for a moment between them.",
    ],
    go: "Use the lull",
    goSub: "The last chance to talk before the first wave",
  },

  /** Solo: the debrief is the station's incident report. (The TV's debrief keeps `debrief.kicker`.) */
  report: {
    kicker: `Incident report · ${STATION_NAME}`,
    act1: "Act I · radio",
    act1Possible: "every round winnable",
    act1Yours: (pct: string) => `possible · you held ${pct}`,
    act2: "Act II · best plan",
    act2Note: "exactly, at best",
    act3: "Act III · crystals",
    act3Note: "your dials, exactly",
    /** Not saved: the Act III card leads with the best dials, the player's below. */
    act3Best: "best dials",
    act3Yours: (pct: string) => `your dials, ${pct}`,
    /** Saved: the player's crystals beat every plan. */
    story:
      "Talking made every round winnable. No plan could replace talking. The crystals beat every plan without carrying a single message.",
    /** Not saved: only the best crystal settings did. */
    storyNotSaved:
      "Talking made every round winnable. No plan could replace talking. The best crystal settings beat every plan without carrying a single message; yours didn't get there this time.",
    noJam: "That's why the storm couldn't jam them: there was no signal to jam.",
  },

  /** Solo: the storm passes and the radio comes back (after the Act III gate, before the incident report). */
  resolution: {
    kicker: `Station log · ${STATION_NAME}`,
    title: "The storm passes",
    /** Saved: the gate passed. */
    log: "The last wave rolls past the station. The core is steady, and the radio crackles back to life.",
    /** Not saved: the debrief opened only because the last wave was played. */
    logNotSaved:
      "The last wave rolls past. Engineering held the core together with emergency measures; the station is damaged, but it's still here. The radio crackles back to life.",
    go: "Read the incident report",
  },

  /** CORA, the solo crewmate: the station's AI, steady and procedural. Speaks only while comms are open (see solo/crew.ts). */
  crew: {
    name: CREW_NAME,
    badge: "AI",
    /** Act I, before the first round: standard procedure. */
    act1Opening: "Quiet night. Each round I'll call my reading and which way I'm turning. Call yours, and keep us in step.",
    /** Act I: CORA's call over the radio each round: her reading, then which way she's turning her pump (it varies
     *  from round to round). */
    readingLight: CORA_READING,
    reading: (light: 0 | 1, pump: 0 | 1) =>
      `${CORA_READING[light]} Turning ${pump === 0 ? "clockwise" : "anticlockwise"}.`,
    /** The storm: her line breaks off mid-sentence. */
    stormBreak: "Something's coming off the star. Hold the pumps st—",
    /** The resolution: the radio is back. */
    resolution: "I couldn't hear you the whole time. But we were in step anyway.",
    resolutionNotSaved: "We made it, just. Those crystals can do better than that. I'd like to know how.",
    opening:
      "Standard procedure: I always pump clockwise. Your call, though: tap a square to set both our plans.",
    agreeCrew: [
      "Clockwise every time. Standard procedure. Suits me.",
      "Reverse when I'm hot. Understood. I'll keep an eye on my gauge.",
      "Reverse when I'm cool? Not in the manual, but I'll fly it.",
      "Anticlockwise every time. Backwards, but steady. Fine.",
    ],
    agreePlayer: [
      "You go clockwise every time. Copy.",
      "You reverse when you're hot. Copy.",
      "You reverse when you're cool. Copy.",
      "You go anticlockwise every time. Copy.",
    ],
    idea: [
      "Want to go back to standard? Clockwise every time.",
      "Same plan again? What if I reverse when I'm hot?",
      "Same plan again? What if I reverse when I'm cool?",
      "Same plan again? What if I go anticlockwise every time?",
    ],
    allTried: "We've tried every pair between us. Maybe it's time to call engineering.",
    readout: {
      overheat: (n: number) => `Round ${n}: we were both hot and pumped the same way. Neither of us could know.`,
      // Facts of the round only: with different plans the pumps can fight without anyone reversing.
      hotCool: (n: number) => `Round ${n}: you were hot, I was cool, and our pumps fought.`,
      coolHot: (n: number) => `Round ${n}: you were cool, I was hot, and our pumps fought.`,
      bothCool: (n: number) => `Round ${n}: we were both cool, and our pumps fought.`,
      timeout: (n: number) => `Round ${n}, your pump never moved. Five seconds goes fast.`,
      purge: (n: number) => `Round ${n}: both hot and we pumped against each other. Textbook purge.`,
      perfect: "Twelve for twelve. Don't get used to it.",
      steady: "Steady wave.",
      /** Act III: how the player used the crystal this wave (CORA always follows hers). */
      ownWay: "You went your own way a lot. I just did what my crystal said.",
      followedAll: "You followed your crystal every round. So did I.",
      act3Good: "Those crystals… that's the steadiest I've seen this ring.",
      act3Bad: "Twelve rounds is a coin toss. Look at what the crystals do in each case before you touch the dials.",
    },
    ceiling: "So it was never us. Every pair fails the same way.",
    tool: "A crystal that tells me which way to turn. Fine. That's my new procedure.",
    tuning:
      "Mine sit where my crystal settles: 22.5° cool, 157.5° hot. Nobody knows yet if that's right.",
    dialsHead: (name: string) => `${name}'s dials (locked)`,
    dialsLine: (cool: string, hot: string) => `: COOL ${cool} · HOT ${hot}, locked`,
    seeDials: "See dials",
  },

  batch: {
    /** Solo: a batch is a storm wave. */
    label: (n: number) => `Wave ${n}`,
    round: (n: number, total: number) => `Round ${n}/${total}`,
    incoming: "Sensors warming up…",
    yourLight: "Your sensor",
    planTag: "Plan",
    measure: "Measure",
    measureHint: "Tap MEASURE to read your crystal.",
    crystalSays: (pump: string) => `Crystal says: ${pump}`,
    crystalTag: "Crystal",
    follow: "Enter follows the crystal · A / C to choose",
    stable: "Stable",
    leak: "Leak",
    slow: "Too slow",
    you: "You",
    crewmate: "Crewmate",
    /** The plan both sides locked in, as a reminder during each round. */
    agreed: (plan: ClassicalStrategy, crewPlan: ClassicalStrategy) => {
      const word = (v: 0 | 1) => (v === 0 ? "clockwise" : "anticlockwise");
      const says = (p: ClassicalStrategy) =>
        p.onGreen === p.onRed ? `always ${word(p.onGreen)}` : `COOL → ${word(p.onGreen)}, HOT → ${word(p.onRed)}`;
      return `Agreed: you ${says(plan)} · ${CREW_NAME} ${says(crewPlan)}`;
    },
    next: "Next round",
    nextSub: "Space / Enter",
  },

  /** Solo round result titles: what physically happened (see roundCause in shared/fiction.ts). */
  outcome: {
    circulate: { title: "Circulating" },
    carry: { title: "Heat carried off" },
    spike: { title: "Pressure spike" },
    overheat: { title: "Overheat" },
    purge: { title: "Purge" },
    slow: { title: "Too slow" },
  },

  readout: {
    kicker: (n: number) => `Wave ${n} complete`,
    held: (wins: number, total: number) => `${wins} of ${total} rounds held`,
    stability: "Station stability",
    actSoFar: (n: number) => `All ${n} rounds this shift`,
    /** Act II: the plan's exact rate, case by case. */
    cases: "If we both follow the plan perfectly",
    casesHead: "Equally likely",
    casesOrder: "Each card: you · ",
    caseTotal: (wins: number, pct: string) => `${wins} of 4 cases: ${pct}`,
    /** When the batch and the true rate disagree about passing 80% (act 2: the plan; act 3: the dial settings). */
    luck: (gap: "above" | "below", act: 2 | 3, pct: string) =>
      `${gap === "above" ? "Above" : "Below"} 80% this time, but ${act === 2 ? "this plan's" : "these settings'"} true rate is ${pct}. Twelve rounds is mostly luck.`,
    /** Act III: the dial settings' exact rate, case by case. */
    crystalCases: "If we both follow the crystals",
    crystalCasesHead: "Equally likely · dials you · ",
    holds: (pct: string) => `holds ${pct}`,
    trueRate: (pct: string) => `True rate: ${pct}`,
    followed: (n: number, total: number) => `You followed the crystal in ${n} of ${total} rounds.`,
    again2: "Back to the huddle",
    again3: "Retune before the next wave",
    report: "Call engineering",
    /** Solo: the gate passed (or the last wave is done): on to the ending. */
    debrief: "The storm passes",
  },

  meter: {
    survival: "Survival 80",
    ceiling: "Ceiling 75",
    limit: "Limit 85.4",
    empty: "No data",
    min: "0%",
    max: "100%",
  },

  ceiling: {
    kicker: "Engineering report · supply deck",
    big: "75%",
    /** Event mode (TV): engineering's summary. Solo shows the plan board and `engineering` instead. */
    lead: "We tried every plan your crew could make. Every single one.",
    engineering: (tried: number, ran: number) =>
      tried === 0
        ? `You didn't try any plans. We ran all ${ran}.`
        : ran === 0
          ? `You tried all ${tried}. We checked your numbers.`
          : `You tried ${tried}. We ran the other ${ran}.`,
    /** Solo: the board shows exact rates, so say what a test above 75% means. */
    truth: "The best plan's true rate is exactly 75%: it loses one round in four. The station needs 80%. A batch above 75% is luck.",
    /** Event mode (TV). */
    lines: [
      "None of them holds more than 75% of rounds. The best plan's true rate is exactly 75%; any batch above it is luck.",
      "The core can take one bad round in five. The station needs 80%.",
    ],
    go: "Then we need something that isn't a plan",
  },

  /** Solo: the tool arrives in a supply pod during a lull. (Event mode's phone uses `tool` below.) */
  pod: {
    kicker: "Supply pod · during the lull",
    title: "The Entanglement Tool",
    lines: [
      `A supply pod docks from engineering with two linked crystals: one for your tool, one for ${CREW_NAME}'s at Table B.`,
      "Engineering's note: the crystals don't carry messages, so the storm can't jam them. Measure one and it gives a direction, linked to its partner in a way no plan can copy.",
      "Turn your dial, tap MEASURE, and the crystal suggests a pump. You decide whether to follow it.",
    ],
    go: "Pick up the tool",
  },

  tool: {
    kicker: "Incoming cargo",
    title: "The Entanglement Tool",
    lines: [
      `Two linked crystals have arrived. One sits in your tool. The other is in ${CREW_NAME}'s tool at Table B.`,
      "Turn the dial. Tap MEASURE. The crystal decides your pump: CLOCKWISE or ANTICLOCKWISE.",
      `${CREW_NAME} has already set hers. Set one dial for COOL and one for HOT, and find what holds.`,
    ],
    go: "Pick up the tool",
  },

  tuning: {
    kicker: "Tool tuning",
    title: "Tune your dials",
    yours: "Your dials",
    hintButton: "Ask engineering for a hint",
    hint: "Try making your two dials 45° apart, and your partner's offset by half that.",
    explainHead: "How the tool works",
    explain:
      "The closer your dial points to CORA's, the more often your crystals give the same direction. Need your pumps to match? Point close to hers. Need them to differ? Point far away.",
    start: (n: number) => `Ride out wave ${n}`,
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
          "Mixing plans at random doesn't help: a random mix only averages cells on the plan board, so it can never beat the best cell.",
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
        stat: (pct: string) => `Your dials' true rate: ${pct}`,
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
    /** Solo, quantum-limit step: the best plan beside the crystals, four cases each. */
    compare: {
      plan: "Best plan: always clockwise",
      dials: (yours: boolean) => (yours ? "Your dials" : "The best dials (0° / 45°)"),
      why: "A plan has to give up one case completely. The crystals spread a small loss across all four.",
    },
    panel: {
      head: "Each pump's clockwise rate, exactly",
      yourRounds: (n: number, cool: string, hot: string) =>
        `In your ${n} real Act III rounds your pump ran clockwise ${cool} of the time when CORA's section was COOL, and ${hot} when it was HOT. Twelve-round batches are noisy.`,
      row: (who: string, light: string) => `${who}: clockwise when partner's side was ${light}`,
      you: "You",
      crewmate: CREW_NAME,
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
    how: "How the art was made",
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
    /** The TV is at localhost and the server found no network address: phones can't reach that link. */
    joinWarning:
      "Phones can't open this link: it only works on this computer. Open this TV page at the laptop's network address (it's printed where you ran pnpm start), or set PUBLIC_URL on the server.",
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
