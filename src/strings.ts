// All player-facing text in one place. Edit freely.
// In-world copy only, up to the debrief: physics words (qubit, Bell, CHSH…) appear only in `debrief`.
import { ROUND_MS } from "./config.ts";
import type { RoundResult } from "./shared/chsh.ts";
import { HOT, roundCause } from "./shared/fiction.ts";

/** The AI crewmate's name: CORA, the Coolant Ring Assistant. Solo radio lines, and event mode's bot seats (server). */
export const CREW_NAME = "CORA";

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

  ring: {
    label:
      "The coolant ring: Section A and Section B each have a pump that runs clockwise or anticlockwise. A relief vent between them unlocks only when both sections are HOT.",
    a: "A · you",
    b: `B · ${CREW_NAME}`,
    vent: "Vent",
    ventNote: "unlocks only when BOTH are HOT",
    ventOpen: "Vent unlocked",
    ventLocked: "Vent locked",
  },

  landing: {
    tagline: "Keep the station alive. Some problems no plan can solve.",
    solo: "Solo demo",
    soloSub: `You and ${CREW_NAME}, the station's AI · about 6 minutes`,
    host: "Host on TV",
    hostSub: "Event mode: open this on the big screen",
    join: "Join with code",
    joinSub: "Event mode: on your phone",
    credits: "Credits",
  },

  intro: {
    kicker: "Station log · shift 1",
    lines: [
      `The station's coolant runs round a ring that passes through two sections. You are at Table A and run your section's pump. ${CREW_NAME}, the station's Coolant Ring Assistant, runs the pump at Table B. She's an AI, not a person.`,
      `The reactor flares at random. Each round your sensor reads COOL or HOT: you can't predict it, and you can't see ${CREW_NAME}'s.`,
      `You each set your pump: CLOCKWISE or ANTICLOCKWISE. No talking between sections during a round. You have ${ROUND_MS / 1000} seconds.`,
    ],
    survival: "The station needs 80% stability. The core can take one bad round in five, and no more.",
    go: "Take your post",
    next: "Next",
    back: "Back",
  },

  plan: {
    kicker: "Strategy huddle",
    colon: ":",
    title: "Agree a plan",
    blind: "Once the batch starts, comms go dark: neither of you can see the other's sensor.",
    test: "Test this plan",
    testSub: "1,000 rounds, no live play",
    tested: (pct: string) => `This plan: ${pct} over 1,000 rounds`,
    start: (n: number) => `Start batch ${n}`,
    last: (pct: string) => `Last batch: ${pct} stable`,
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
    headChoose: "Plan board · tap to choose",
    rows: "You",
    cols: "Crew",
    legendExact: "Big: exact rate. Small: your test. Corner: engineering's run.",
    cell: (you: string, crew: string, value: string) => `You ${you}, crewmate ${crew}: ${value}`,
    untested: "not tested",
    exact: (pct: string) => `exactly ${pct}`,
    yourTest: (pct: string) => `your test ${pct}`,
    yourTestShort: (pct: string) => `you ${pct}`,
    engRun: "run by engineering",
  },

  /** Comms are open between batches, dark during one. */
  comms: {
    radio: "Radio",
    dark: "Comms dark",
    darkSub: "No talking until the batch ends.",
  },

  /** The station's automatic log after each round: impersonal, both sides, the outcome and its cause. */
  telemetry: {
    head: "Station telemetry",
    line: (r: RoundResult) => {
      const reading = (l: 0 | 1) => (l === HOT ? "HOT" : "COOL");
      const sensors = r.x === r.y ? `Both sections ${reading(r.x)}.` : `A ${reading(r.x)} · B ${reading(r.y)}.`;
      if (r.a === null || r.b === null) return `${sensors} Pump ${r.a === null ? "A" : "B"} not set. Round lost.`;
      const pumps = r.a === r.b ? "Pumps agreed." : "Pumps fought.";
      const cause = {
        circulate: "Coolant circulating. Stable.",
        carry: "Heat carried to the cool side. Stable.",
        spike: "Vent locked. Pressure spike.",
        overheat: "Vent unlocked, no purge. Overheat.",
        purge: "Vent unlocked. Purge. Stable.",
        slow: "Round lost.",
      }[roundCause(r)];
      return `${sensors} ${pumps} ${cause}`;
    },
  },

  /** CORA, the solo crewmate: the station's AI, steady and procedural. Speaks only while comms are open (see solo/crew.ts). */
  crew: {
    name: CREW_NAME,
    badge: "AI",
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
    tested: (pct: string, rate: number) =>
      rate >= 0.7
        ? `${pct} over a thousand. Close, but the core wants 80.`
        : rate <= 0.3
          ? `${pct}. Let's not fly that one.`
          : `${pct}. Middling. The core wants 80.`,
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
      steady: "Steady batch. Let's see what a thousand rounds say.",
      act3Good: "Those crystals… that's the steadiest I've seen this ring. Run the thousand to be sure.",
      act3Bad: "Twelve rounds is a coin toss. Run the thousand before you touch the dials.",
    },
    ceiling: "So it was never us. Every pair fails the same way.",
    tool: "Engineering never sends anything this fancy. I'll set mine; you find a setting for yours, and we'll see what holds.",
    tuning:
      "Mine sit where my crystal settles: 22.5° cool, 157.5° hot. Nobody knows yet if that's right.",
    dialsHead: (name: string) => `${name}'s dials (locked)`,
    dialsLine: (cool: string, hot: string) => `: COOL ${cool} · HOT ${hot}, locked`,
    seeDials: "See dials",
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
    kicker: (n: number) => `Batch ${n} complete`,
    held: (wins: number, total: number) => `${wins} of ${total} rounds held`,
    stability: "Station stability",
    actSoFar: (n: number) => `All ${n} rounds this shift`,
    simulate: "Run 1,000 rounds",
    simulateSub2: "Test your plan against 1,000 more sensor readings",
    simulateSub3: "Test your tool settings against 1,000 more sensor readings",
    simLabel: "1,000-round test",
    simResult: (pct: string) => `1,000-round test: ${pct}`,
    added: (pct: string) => `Added to the plan board: ${pct}`,
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
    /** Event mode (TV): engineering's summary. Solo shows the plan board and `engineering` instead. */
    lead: "We tried every plan your crew could make. Every single one.",
    engineering: (tested: number, ran: number) =>
      tested === 0
        ? `You didn't test any plans. We ran all ${ran}.`
        : ran === 0
          ? `You tested all ${tested}. We checked your numbers.`
          : `You tested ${tested}. We ran the other ${ran}.`,
    /** Solo: the board shows exact rates, so say what a test above 75% means. */
    truth: "The best plan's true rate is exactly 75%: it loses one round in four. The station needs 80%. A test above 75% is luck.",
    /** Event mode (TV). */
    lines: [
      "None of them holds more than 75% of rounds. The best plan's true rate is exactly 75%; any batch above it is luck.",
      "The core can take one bad round in five. The station needs 80%.",
    ],
    go: "Then we need something that isn't a plan",
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
