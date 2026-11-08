// All player-facing text in one place. Edit freely.
// In-world copy only, up to the debrief: physics words (qubit, Bell, CHSH…) appear only in `debrief`.
import { ACT1_ROUND_MS, ACT1_ROUNDS, MP_ACT1_ROUND_MS } from "./config.ts";
import type { ClassicalStrategy, RoundResult } from "./shared/chsh.ts";
import { HOT, roundCause } from "./shared/fiction.ts";

/** The AI crewmate's name: CORA, the Coolant Ring Assistant. Solo radio lines, and event mode's bot seats (server). */
export const CREW_NAME = "CORA";

/** The station's name in the solo story. PLACEHOLDER: may change. Always "station", never "ship". */
export const STATION_NAME = "Kestrel Station";

/** Act I: how CORA calls her reading over the radio. */
const CORA_READING = { 0: "Cool here.", 1: "Hot here!" } as const;
const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III" };
const pumpWord = (v: 0 | 1) => (v === 0 ? "clockwise" : "anticlockwise");
/** A plan in a few words: "always clockwise", or "COOL → clockwise, HOT → anticlockwise". */
const planSays = (p: ClassicalStrategy) =>
  p.onGreen === p.onRed ? `always ${pumpWord(p.onGreen)}` : `COOL → ${pumpWord(p.onGreen)}, HOT → ${pumpWord(p.onRed)}`;

/** The numbers in the remote's clue talking points, computed from the maths (src/screens/Remote.tsx). */
export type ClueTalk = {
  minGap: string;
  maxGap: string;
  line: string;
  matchGap: string;
  differGap: string;
  same: string;
  differ: string;
  rate: string;
  planA: string;
  planB: string;
};

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
    agreed: (plan: ClassicalStrategy, crewPlan: ClassicalStrategy) =>
      `Agreed: you ${planSays(plan)} · ${CREW_NAME} ${planSays(crewPlan)}`,
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
    /** A section of the ring, named for the result ring: "A · you", "B · Bo". */
    ringSide: (table: string, name: string) => `${table} · ${name}`,
    /** The TV's briefing when the night shift starts: the solo background, for pairs. */
    briefing: {
      kicker: `Station log · ${STATION_NAME}`,
      title: "The night shift",
      lines: [
        `${STATION_NAME} drifts on the edge of a young, restless star. When it flares, one of the station's two sections heats up without warning, and a coolant ring through both carries the heat away.`,
        `Tonight you keep the night shift in pairs: one of you at Table A, one at Table B, each running the pump in your own section. ${CREW_NAME}, the station's AI, runs any empty seat.`,
      ],
      routine: `Each round: your sensor on your phone, your partner's reading and pump on the radio. Set your pump within ${MP_ACT1_ROUND_MS / 1000} seconds.`,
    },
    /** Act I on a phone: the radio with a human partner (CORA speaks her own lines, `crew.reading`). */
    radio: {
      reads: (name: string, light: 0 | 1) => `${name} reads ${light === 1 ? "HOT" : "COOL"}.`,
      turning: (name: string, pump: 0 | 1) => `${name} is turning ${pump === 0 ? "clockwise" : "anticlockwise"}.`,
      noPump: (name: string) => `${name} hasn't set a pump yet.`,
    },
    /** Act II on a phone: the partner's plan, live in the lull (`name` is the partner's, or CORA's). */
    partnerPlan: (name: string) => `${name}'s plan`,
    /** During a wave: both locked plans. */
    agreed: (plan: ClassicalStrategy, partner: string, partnerPlan: ClassicalStrategy) =>
      `Agreed: you ${planSays(plan)} · ${partner} ${planSays(partnerPlan)}`,
    /** A round's telemetry line. Only "too slow" names anyone: whose pump wasn't set. */
    why: (r: RoundResult, mine: "a" | "b", partner: string) => {
      if (roundCause(r) !== "slow") return S.telemetry.why(r);
      const theirs = mine === "a" ? r.b : r.a;
      const own = mine === "a" ? r.a : r.b;
      if (own === null && theirs === null) return "Neither pump was set in time.";
      return own === null ? "Your pump wasn't set in time." : `${partner}'s pump wasn't set in time.`;
    },
    /** The TV after a wave: each pair's plans, case by case. */
    casesOrder: "Each card: Table A · Table B",
    pairPlans: (a: string, aPlan: string, b: string, bPlan: string) => `${a}: ${aPlan} · ${b}: ${bPlan}`,
    waveHeld: (wins: number, total: number) => `This wave: ${wins} of ${total} held`,
    /** The TV's luck line, one line per pair: the wave beat 80%, the plan can't. */
    lucky: (pct: string) => `Above 80% by luck: this plan's true rate is ${pct}.`,
    /** The engineering report's board: Table A's plan (rows) × Table B's (columns). */
    board: {
      rows: "Table A",
      cols: "Table B",
      cell: (a: string, b: string, value: string) => `Table A ${a}, Table B ${b}: ${value}`,
    },
    /** The tool reveal, on the TV and phones: the supply pod and engineering's note (names no single partner). */
    pod: {
      kicker: "Supply pod · during the lull",
      title: "The Entanglement Tool",
      lines: [
        "A supply pod docks from engineering: two linked crystals for every pair, one at each table.",
        "Engineering's note: the crystals carry no messages, so the storm can't jam them.",
        "The crystals don't replace your plan. They change what a plan can say.",
      ],
    },
    /** Act III's crystal plan (event): the player plans the setting; the station measures; the crystal suggests. */
    crystalPlan: {
      head: "Your crystal plan",
      /** Each row, in full (the setting list's label): the station measures; the player plans. */
      row: (sensor: string) => `When your sensor reads ${sensor}, the station measures your crystal at:`,
      /** On screen the card says it once, then a short row per reading. */
      lead: "When your sensor reads COOL or HOT, the station measures your crystal at:",
      partnerHead: (name: string) => `${name}'s crystal plan`,
      line: (cool: string, hot: string) => `COOL ${cool} · HOT ${hot}`,
      coraSet: `${CREW_NAME} has set her own plan.`,
      seeCard: "See both",
      /** Two humans, both still at the start (0°): the starting line. */
      startHumans: (pct: string) =>
        `Both your plans start at 0°. Measured at the same setting, the crystals always agree, so this plan matches in every case, just like your best Act II plan: ${pct}.`,
      /** With CORA: her settings, and what the pair holds with the player's plan as it is now. */
      startCora: (cool: string, hot: string, pct: string) =>
        `${CREW_NAME} measures at COOL ${cool}, HOT ${hot}. With your plan as it is, your pair holds ${pct}. Can you do better?`,
      body: "Agree on your crystal plans. When the wave hits, the radio goes dark.",
      /** The first time: one line at the top of the card (it replaced E3c's comparison table). */
      like: "Like an Act II plan, but for each reading you choose a crystal setting, not a direction.",
      retune: "Change your crystal plan",
    },
    /** The crystals' rule: shown on the TV, and in a sheet on phones, from the tool reveal on. */
    crystalRule: {
      chip: "Crystal rule",
      head: "The crystals' rule",
      /** Three lines, in order; the gap table follows line 2. */
      coin: "Each crystal says CLOCKWISE or ANTICLOCKWISE at random, like a coin flip, whatever its setting.",
      closer: "Two linked crystals land the same way more often the closer their settings are:",
      follow:
        "Follow your crystals, and your pumps match exactly when your crystals agree. So keep settings close in the three cases that need matching pumps, and far apart when both sensors are HOT.",
      gap: "Gap",
      same: "Same direction",
      /** `half` = 180°, `max` = 90°, then an example pair of settings and their folded gap (all computed). */
      fold: (half: string, max: string, a: string, b: string, gap: string) =>
        `A setting and the one ${half} round are the same measurement, so a gap is never more than ${max} (${a} and ${b} are ${gap} apart).`,
    },
    /** The read-only fan: the pair's four settings, and the gap in each case. */
    fan: {
      label: "Your pair's four settings and the gap in each case",
      head: "Gaps",
      caseName: (x: string, y: string) => `A ${x} · B ${y}`,
      needSame: "same",
      needDiffer: "differ",
      /** From clue 2: each case's chance beside its gap ("85% same"). */
      chance: (pct: string, need: "same" | "differ") => `${pct} ${need === "same" ? "same" : "differ"}`,
    },
    /** The clue ladder, released by the facilitator (TV and remote); every clue so far stays visible. */
    clues: {
      chip: (n: number) => `Clues (${n})`,
      head: "Clues",
      titles: ["The crystals' rule", "A hint", "A nudge", "The answer"],
      /** Clue 2, for one pair below 80%: its weakest case, its gap and chance, and which way to move. */
      hint: (caseName: string, gap: string, pct: string, need: "same" | "differ") =>
        need === "same"
          ? `Your weakest case: ${caseName}, gap ${gap}, same only ${pct} of the time. This case needs your settings close: bring them closer.`
          : `Your weakest case: ${caseName}, gap ${gap}, differ only ${pct} of the time. Both HOT needs your settings far apart: move them further apart.`,
      /** The TV's pair card, beside the true rate: the case as its card reads ("HOT · HOT"; the outlined card shows
       *  its gap and chance) and which way to move. */
      tvHint: (cardName: string, need: "same" | "differ") =>
        need === "same" ? `weakest ${cardName}: bring closer` : `weakest ${cardName}: move further apart`,
      /** The TV's lull list (no case cards there): the case, its gap and chance, and which way to move. */
      listHint: (caseName: string, gap: string, pct: string, need: "same" | "differ") =>
        need === "same"
          ? `${caseName}, gap ${gap}, same ${pct}: bring closer.`
          : `${caseName}, gap ${gap}, differ ${pct}: move further apart.`,
      /** A pair already at 80%+ (`pct` = the 80% line). */
      foundIt: (pct: string) => `Found it: ${pct}+`,
      weakestPair: (pair: number) => `Pair ${pair}`,
      noWave: "After your first wave.",
      nudge:
        "Going around your four settings, the differ gap can never be bigger than the three match gaps added together. You want the match gaps small and the differ gap near 90°. How would you spread them?",
      /** `fold` names a setting over 90° and the same setting below 0° (computed), or is empty. */
      answer: (spacing: string, a: string, b: string, fold: string, matchGap: string, same: string, differGap: string, differ: string, rate: string) =>
        `Spread the four settings evenly, ${spacing} apart. For example ${a}; ${b}${fold}. The three match gaps are ${matchGap} (${same} the same) and the differ gap is ${differGap} (${differ} different): ${rate}.`,
      sameSetting: (a: string, b: string) => ` (${a} is the same setting as ${b})`,
      plan: (table: string, cool: string, hot: string) => `${table}: COOL ${cool}, HOT ${hot}`,
    },
    /** An Act III round on a phone: what the station did with the plan. */
    chain: {
      sensor: "Your sensor",
      plan: "your plan",
      crystal: "the crystal says",
      /** After the direction: it was a coin flip. */
      flip: "(this time; it could have been either)",
    },
    /** The TV in Act III: the situation in one line, what players can do now, and the question they're working on. */
    explain: {
      tool: {
        now: "Engineering has sent linked crystals: one at each table, for every pair.",
        can: "Read the crystals' rule. Next, each pair plans their settings in the lull.",
        question: "Which settings keep three gaps small and one far apart?",
      },
      strategy: {
        now: "The lull: the radio still works. Plan your crystal settings together.",
        can: "Pick a setting for COOL and for HOT on your phone; your partner sees it live.",
        question: "How close can you keep three gaps while the fourth stays far apart?",
      },
      round: {
        now: "The wave: radio down. The station measures each crystal at your planned setting.",
        can: "Follow your crystal: that's how your plan works. Going against it is a guess.",
        question: "Does your plan hold in all four cases?",
      },
      batchDone: {
        now: "The wave has passed: each pair's crystal plans, case by case.",
        can: "Look at your weakest case. Compare notes with a pair that found 80%.",
        question: "Which gap is letting you down?",
      },
      labels: { now: "Now", can: "You can", question: "The question" },
    },
    /** When a wave starts, the plans are stamped (phones and TV), in Acts II and III. */
    locked: {
      stamp: "Plan locked",
      tvStamp: "Plans locked",
      act3: (cool: string, hot: string) => `COOL ${cool} · HOT ${hot}`,
    },
    /** The TV after an Act III wave: each pair's crystal plans case by case (gap, chance), who followed, which pairs
     *  found 80%, and the crew's saved-or-not. */
    wave3: {
      pairPlans: (a: string, aPlan: string, b: string, bPlan: string) => `${a}: ${aPlan} · ${b}: ${bPlan}`,
      plan: (cool: string, hot: string) => `${cool} / ${hot}`,
      /** A case on the TV after a wave: its gap, then (beside it) the chance it holds. */
      gap: (gap: string) => `gap ${gap} ·`,
      foundIt: "found it: 80%+",
      /** The wave and the true rate disagree about 80%. */
      luckyAbove: (pct: string) => `Above 80% by luck: the plans' true rate is ${pct}.`,
      luckyBelow: (pct: string) => `Below 80% by bad luck: the plans' true rate is ${pct}.`,
      holds: "80%+ holds",
      followed: (n: number, of: number) => `followed ${n}/${of}`,
      wave: (wins: number, rounds: number) => `wave ${wins}/${rounds}`,
      crewFollowed: (n: number, of: number) => `crystal followed ${n}/${of}`,
      saved: (pct: string) => `Crystal plans average ${pct}: the station holds.`,
      notSaved: (pct: string) => `Not yet: crystal plans average ${pct}, the station needs 80%.`,
    },
    /** The storm passes (event): the room is told the radio is back. Phones get their own prompt (checkpoint 3). */
    resolution: {
      /** The TV's line: what the crew's crystal plans averaged (the wave that saved the station, or the latest). */
      plans: (pct: string) => `The crew's crystal plans averaged ${pct}.`,
      room: "Comms are back. Turn to your partner and tell them what you were thinking during the storm.",
      /** On a phone with a human partner (CORA's partners hear her own line, `crew.resolution`). */
      head: "Comms are back",
      prompt: (name: string) => `Tell ${name} what you were thinking during the storm.`,
    },
    /** Where solo has CORA say something personal, a human pair gets a prompt instead. */
    beats: {
      head: "Turn to your partner",
      ceiling: (name: string) => `Did you and ${name} blame each other? No plan beats 75%: it was never either of you.`,
      ceilingRoom: "Turn to your partner. Did you blame each other? No plan beats 75%: it was never either of you.",
    },
    /** The incident report on the TV: solo's report in the crew's words. */
    report: {
      three: {
        act1Yours: (pct: string) => `possible · the crew held ${pct}`,
        act3Note: "the crew's crystal plans, exactly",
        act3Yours: (pct: string) => `the crew's crystal plans, ${pct}`,
        story:
          "Talking made every round winnable. No plan could replace talking. The crew's crystals beat every plan without carrying a single message.",
        storyNotSaved:
          "Talking made every round winnable. No plan could replace talking. The best crystal settings beat every plan without carrying a single message; the crew's didn't get there this time.",
      },
      pairDials: (pair: number, a: string, b: string) => `Pair ${pair}'s crystal plans (${a} & ${b})`,
      bestPlans: "The best crystal plans (0° / 45°)",
      /** The report's steps in the crew's words (solo keeps S.debrief.steps). */
      steps: [
        {
          title: "No plan beats 75%",
          body: [
            "Under the station is the CHSH game (Clauser, Horne, Shimony and Holt, 1969). The sensors are its random input bits x, y (COOL = 0, HOT = 1), the pumps its output bits a, b (CLOCKWISE = 0, ANTICLOCKWISE = 1), and “match unless both HOT” is its rule: a ⊕ b = x ∧ y. The vent is the story for the flipped case.",
            "The wall you hit in Act II is a Bell inequality. Two players who can't talk, with any plan agreed in advance (even a random one), win at most 75% of rounds.",
            "Mixing plans at random doesn't help: a random mix only averages cells on the plan board, so it can never beat the best cell.",
          ],
        },
        {
          title: "Entanglement broke through",
          body: [
            "The two crystals were a pair of entangled qubits. Measured at settings θA and θB, your two pumps agree with probability cos²(θA − θB): the crystals' rule.",
            "With the four settings spread evenly, 22.5° apart (A: 0° and 45°; B: 22.5° and −22.5°, shown as 157.5°), a crystal plan wins cos²(22.5°) ≈ 85.4% of rounds. No quantum strategy does better: this is the Tsirelson bound.",
            "Real experiments have broken the 75% wall with entangled photons; that work won the 2022 Nobel Prize in Physics.",
          ],
        },
        {
          title: "But no messages",
          body: [
            "Your own pump ran clockwise about half the time, whether your partner's section was COOL or HOT. So you can't read their sensor from your result, and the crystals can't carry a message.",
            "Only the correlation between your two results changed. That is what no-signalling means.",
          ],
        },
        { title: "Credits", body: [] as string[] },
      ],
      compare: {
        plan: "Best plan: always clockwise",
        why: "A plan has to give up one case completely. A crystal plan spreads a small loss across all four.",
      },
      /** On a phone: the pair's own three numbers. */
      phoneHead: (name: string) => `You and ${name}`,
      phoneAct1: "Act I · radio",
      phoneAct2: "Act II · your plans",
      phoneAct3: "Act III · your crystal plans",
      phoneAct1Note: "held, with the radio",
      phoneAct2Note: "true rate, exactly",
      phoneAct3Note: "true rate, exactly",
      notPlayed: "not played",
      crewRounds: (n: number, cool: string, hot: string) =>
        `In the crew's ${n} real Act III pumps, a pump ran clockwise ${cool} of the time when the partner's section was COOL, and ${hot} when it was HOT.`,
    },
    /** The storm in event mode. With a human partner the radio's last words come from the station log. */
    storm: {
      log: "Station log",
      logBreak: "Flare warning: a surge is coming off the star. Hold the pumps st—",
      next: "Next: the lull, the last chance to talk before the first wave.",
    },
  },

  tv: {
    station: (code: string) => `Station ${code}`,
    join: "Join on your phone",
    joinAt: (url: string) => `or open ${url}`,
    /** The laptop has other network addresses; one of them may be the one phones can reach. */
    tryOther: "Not working? Try:",
    useAddress: (address: string, iface: string) => `Use ${address} (${iface}) for the QR code and link`,
    /** The TV is at localhost and the server found no network address: phones can't reach that link. */
    joinWarning:
      "Phones can't open this link: it only works on this computer. Open this TV page at the laptop's network address (it's printed where you ran pnpm start), or set PUBLIC_URL on the server.",
    code: "Code",
    noPlayers: "Nobody aboard yet.",
    phase: {
      lobby: "Scan to join. Pick Table A or Table B.",
      briefing: "The night shift",
      storm: "Static",
      strategy: "The lull: last chance to talk",
      round: "Storm wave: radio down, no talking",
      roundResult: "Storm wave: radio down, no talking",
      batchDone: "The wave has passed",
      ceiling: "Engineering report",
      tool: "The Entanglement Tool",
      resolution: "The storm passes",
      debrief: "Debrief",
    },
    /** Act I's rounds: the radio works, so the banner says so. */
    act1Banner: "Night shift: radio working, talk freely",
    act1RoundOf: (round: number) => `Night shift · round ${round}/${ACT1_ROUNDS}`,
    batchHeld: (pct: string) => `${pct} of rounds held`,
    roundOf: (batch: number, round: number, size: number) => `Wave ${batch} · round ${round}/${size}`,
    pooled: "Station stability · last 48 rounds",
    act1Pooled: "Night shift · every round so far",
    allTime: (act: number, pct: string, n: number) => `Act ${ROMAN[act]} so far: ${pct} of ${n} rounds`,
    timeouts: (n: number) => `${n} too slow`,
    pair: (id: number) => `Pair ${id}`,
    controls: "Host controls",
    cmd: {
      startNightShift: "Start the night shift",
      startStrategy: "Use the lull",
      startBatch: "Start the wave",
      revealCeiling: "Reveal ceiling",
      unlockTool: "Unlock tool",
      stormPasses: "The storm passes",
      debrief: "Incident report",
      reportBack: "Back",
      reportNext: "Next",
      setSpeed: "Speed",
      auto: "Play",
      manual: "Pause",
      next: "Next",
      nextClue: "Next clue",
      unpairRemotes: "Unpair remotes",
      debugAct2: "Jump to Act II (lull)",
      debugAct3: "Jump to Act III (tool reveal)",
      reset: "Reset",
    },
    /** The debug jump (key D on the TV), for testing: skips the story. */
    debug: {
      title: "Debug: jump to an act",
      note: "For testing. Skips the story; what's been played so far is kept.",
      inWave: "Close the round first (Next).",
      key: "D",
    },
    /** Next, in a round and on a result. */
    closeRound: "Close the round",
    nextRound: "Next round",
    /** Auto / manual (takes effect at once): Pause switches to manual, Play back to auto; the speed sits behind ▾. */
    auto: {
      play: "▶ Play",
      pause: "⏸ Pause",
      /** Auto, while something is counting down: the seconds left. */
      counting: (secs: number) => `⏸ ${secs} s`,
      playLabel: "Play: rounds and results move on by themselves",
      pauseLabel: "Pause: switch to manual, then press Next to move on",
      menu: "Speed",
      speeds: { relaxed: "Relaxed", brisk: "Brisk" },
      summary: (choose: string, result: string) => `${choose} s to choose · ${result} s result`,
      manualNote: "Manual: press Next",
    },
    keys: "Space / → next · P play / pause",
    /** The lull: how long the room has been talking (a guide, not a countdown). */
    talking: (time: string) => `Talking for ${time}`,
    /** A round, on a pair card: who hasn't chosen yet (never what anyone chose). */
    stillChoosing: (names: string) => `Still choosing: ${names}`,
    allChosen: "Both have chosen",
    /** A pair card: an away player's seat, covered by CORA until they rejoin. */
    covering: (name: string) => `${CREW_NAME} for ${name}`,
    /** Start batch, during the briefing: starts Act I's rounds. */
    startRounds: "Start the rounds",
    resetConfirm: "Reset the session? Scores are cleared; players stay.",
    /** Next clue, labelled with the clue it releases (1 comes with the tool). */
    /** `notYet` = pairs not yet at 80% (for clue 2, the hint). */
    nextClue: (n: number, notYet = 0) =>
      n === 2
        ? `Next clue: a hint (${notYet === 0 ? "every pair at 80%+" : `${notYet} ${notYet === 1 ? "pair" : "pairs"} not yet`})`
        : `Next clue: ${["", "the rule", "", "a nudge", "the answer"][n] ?? ""}`,
    wholeCrew: "Whole crew",
    wobble: "A few rounds each makes the numbers wobble. Over many rounds every row settles at 50%, whatever the partner's sensor read.",
    marginalHead: {
      player: "Crew member",
      cool: "Clockwise when partner's side was COOL",
      hot: "Clockwise when partner's side was HOT",
      rounds: "Rounds",
    },
    /** The phone remote: a button in the TV's header and its pairing dialog. */
    remote: {
      button: "Remote",
      /** The header button while remotes are paired. */
      connected: (n: number) => (n === 1 ? "Remote ✓" : `Remotes ✓ ${n}`),
      title: "Phone remote",
      body: "Scan with the facilitator's phone to run the session from anywhere in the room: Next, Play / Pause, Start the wave.",
      warning: "Anyone with this code can run the session. Unpair to make a new code.",
      count: (n: number) => `Remotes connected: ${n}`,
      unpair: "Unpair remotes",
    },
  },

  /** The facilitator's phone remote (`/host`). Talking points come from docs/facilitator.md's run of show. */
  remote: {
    title: "Facilitator remote",
    station: (code: string) => `Remote · Station ${code}`,
    pairing: "Pairing with the TV…",
    expired: "This remote link has expired",
    expiredBody: "The TV made a new code (or the server restarted). On the TV, press Remote and scan the code again.",
    noLink: "Open the remote from the TV",
    noLinkBody: "On the TV, press Remote (top right) and scan the code with this phone.",
    noPlayers: "Waiting for players to join.",
    aboard: (players: number, pairs: number) => `${players} aboard · ${pairs} ${pairs === 1 ? "pair" : "pairs"}`,
    reportStep: (step: number, of: number) => `Report step ${step}/${of}`,
    /** A pair's line in the room list: on a result, what happened (as on the TV). */
    pairLine: (id: number, text: string) => `Pair ${id}: ${text}`,
    talkHead: "Say",
    roomHead: "The room",
    reset: "Reset the session",
    resetTitle: "Reset the session?",
    resetBody: "Scores are cleared and the session goes back to the lobby. Players stay.",
    resetCancel: "Cancel",
    resetConfirm: "Reset",
    /** What to say now, per phase (Act I's rounds and the Act III lull have their own). */
    talk: {
      lobby: ["Players scan the TV's code, enter a name and pick Table A or B.", "Start the night shift once everyone is seated."],
      briefing: [
        "Read the story and the rule aloud: pumps match, unless both sensors are HOT, then they must differ.",
        "Then start the rounds.",
      ],
      act1Round: ["The radio works: talking out loud is fine.", "A pump can change until the round ends."],
      round: ["Radio down: no talking between tables.", "Next closes the round if someone is stuck (they count as too slow)."],
      roundResult: ["Read the cause aloud, then Next round."],
      storm: ["Read the storm log aloud: the waves will kill the radio.", "Then use the lull."],
      strategy: [
        "Last chance to talk: each player picks one of four plans and sees their partner's choice.",
        "Start the wave when the room is ready (2–3 minutes is plenty).",
      ],
      act3Strategy: [
        "Each player picks a crystal plan: a setting for COOL and one for HOT. Partners see each other's live.",
        "Stuck after a wave? Release the next clue.",
      ],
      batchDone: [
        "Point at a ✗ case: the round that plan always loses.",
        "\"By luck\" means the wave beat 80% but the plan can't.",
        "After a second wave, reveal the ceiling.",
      ],
      act3BatchDone: [
        "Pairs at 80% or more glow green.",
        "\"Not yet\"? Play another lull and wave. Saved? The storm passes.",
      ],
      ceiling: [
        "No plan beats 75%: the best plan loses one in four.",
        "\"Turn to your partner. Did you blame each other? It was never either of you.\"",
      ],
      tool: [
        "Read engineering's note aloud: the crystals carry no messages, so the storm can't jam them.",
        "\"The crystals don't replace your plan. They change what a plan can say.\"",
      ],
      /** Act III, for the latest clue released (1–4); every number comes from the maths (`ClueTalk`). */
      clue: (n: number, k: ClueTalk): string[] =>
        [
          [
            "Clue 1, the crystals' rule: each crystal alone is a coin flip, whatever its setting.",
            `Read the table aloud: a gap of ${k.minGap} always lands the same way, ${k.maxGap} never does. Followed crystals make matching pumps exactly when they agree.`,
          ],
          [
            `Clue 2: the pairs not yet at ${k.line} see their weakest case, with which way to move. Ask them what that case needs.`,
          ],
          [
            "Clue 3: the differ gap is never bigger than the three match gaps added together.",
            `Equal match gaps and the biggest differ gap: three times one match gap (three gaps of ${k.matchGap} make ${k.differGap}).`,
          ],
          [
            `Clue 4, the answer: settings ${k.matchGap} apart. ${k.planA}; ${k.planB}.`,
            `Three match gaps of ${k.matchGap} (${k.same} the same) and a differ gap of ${k.differGap} (${k.differ} different): ${k.rate}.`,
          ],
        ][n - 1] ?? [],
      resolution: ["Ask each player to tell their partner what they were thinking during the storm.", "Give it a minute."],
      debrief: [
        "The three numbers: with the radio, the best plan, the crystals.",
        "Then the best plan beside the crystals, and why the crystals can't send a message.",
      ],
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
    waitingSeat: "You'll get a partner after this wave.",
    huddle: "The lull: last chance to talk",
    huddleBody: "Agree on your plans. When the clock runs out the wave hits, and the radio goes dark.",
    /** The briefing on a phone: the big screen tells the story. */
    briefing: "The night shift",
    briefingBody: "The radio works tonight: each round you'll hear your partner's reading and pump. Eyes on the big screen.",
    /** Act I: the pump can change until the round ends. */
    act1Change: "You can change it until the round ends.",
    plan: "Your plan",
    pumpSet: (v: string) => `Pump set: ${v}. Hold…`,
    /** The "⋯" menu: leaving, with a confirmation where staying is the primary action. */
    menu: {
      open: "More",
      leave: "Leave the game",
      confirmTitle: "Leave the station?",
      confirmPartner: (name: string) => `${name} will be paired with CORA until you rejoin with the same name and table.`,
      confirmAlone: "Rejoin with the same name and table to take your seat back.",
      stay: "Stay",
      leaveNow: "Leave",
    },
    /** Where the Leave button used to be: what's happening while there's nothing to press. */
    status: {
      watch: "Look at the big screen. The facilitator will move things on.",
      manualResult: "Result on the big screen. The facilitator starts the next round.",
      autoResult: "Result on the big screen. The next round starts by itself.",
    },
    /** After setting your pump: whether your partner has (never what they chose). */
    partnerChosen: (name: string) => `${name} has chosen.`,
    waitingFor: (name: string) => `Waiting for ${name}…`,
    /** Your partner is away and CORA is covering their seat. */
    partnerCovered: (name: string, table: string) => `Partner: ${CREW_NAME} (covering for ${name}, Table ${table})`,
  },
};
