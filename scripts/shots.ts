// pnpm shots [--out <name>] [--all]       screenshot every solo screen, played like a player
// pnpm shots --compare <before> <after>    per-screen contact sheets: before above after, sizes side by side
//
// Builds the static site, serves it with `vite preview` (no station, like the Vercel deploy) and drives the solo flow
// in Playwright's Chromium. Reliable without touching production code: Math.random is seeded before the app loads (so
// the store deals the same rounds every run) and Playwright's clock owns Date.now / setTimeout / rAF, so the script
// steps the round timers itself. Output goes to shots/<out>/<size>/ (git-ignored): NN-name.png is the first viewport,
// NN-name.full.png the whole page with the fold marked. report.md: page height in screen-heights, whether the primary
// action is in the first viewport, and any horizontal overflow.
//
// First run: `pnpm exec playwright install chromium` (or SHOTS_CHANNEL=chrome to use the installed Chrome).
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { build, preview } from "vite";
import { BATCH_SIZE, LEAD_MS, RESULT_AUTO_MS, ROUND_MS } from "../src/config.ts";
import { S } from "../src/strings.ts";

// The page.evaluate callbacks run in the browser. This script is type-checked on the Node side (no DOM lib), so name
// the few browser globals they use here, scoped to this module.
type El = {
  closest(sel: string): El | null;
  textContent: string | null;
  offsetParent: unknown;
  getBoundingClientRect(): { bottom: number };
  remove(): void;
};
declare const document: {
  fonts: { ready: Promise<unknown> };
  activeElement: El | null;
  documentElement: { scrollHeight: number; scrollWidth: number; clientWidth: number };
  body: { insertAdjacentHTML(where: string, html: string): void };
  querySelectorAll(sel: string): Iterable<El>;
};
declare const innerHeight: number;
declare function scrollTo(x: number, y: number): void;

const SIZES = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "ipad-landscape-1180x820", width: 1180, height: 820 },
  { name: "iphone-390x844", width: 390, height: 844, mobile: true },
];
const EXTRA_SIZES = [
  { name: "iphone-se-375x667", width: 375, height: 667, mobile: true },
  { name: "ipad-portrait-820x1180", width: 820, height: 1180, mobile: true },
];
type Size = (typeof SIZES)[number] & { mobile?: boolean };

const ROOT = resolve(import.meta.dirname, "..");
const SHOTS = join(ROOT, "shots");
const SEED = 20261016;

/** The smallest text in any visible ring, in screen pixels (font size × the SVG's scale). Null if no ring. */
const RING_TEXT = `(() => {
  let min = Infinity;
  for (const svg of document.querySelectorAll("svg.ring")) {
    const r = svg.getBoundingClientRect();
    if (!r.width || svg.closest("[hidden]") || getComputedStyle(svg).display === "none") continue;
    const scale = r.width / svg.viewBox.baseVal.width;
    for (const t of svg.querySelectorAll("text")) {
      if (!t.textContent.trim()) continue;
      min = Math.min(min, parseFloat(getComputedStyle(t).fontSize) * scale);
    }
  }
  return min === Infinity ? null : min;
})()`;

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const opt = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);

const browser = await chromium.launch({ channel: process.env.SHOTS_CHANNEL || undefined });
try {
  if (flag("--compare")) {
    const [before, after] = args.slice(args.indexOf("--compare") + 1);
    if (!before || !after) throw new Error("usage: pnpm shots --compare <before> <after>");
    await compare(browser, before, after);
  } else {
    await capture(browser, opt("--out") ?? "latest", flag("--all") ? [...SIZES, ...EXTRA_SIZES] : SIZES);
  }
} finally {
  await browser.close();
}

// ---------- capture ----------

type Row = { shot: string; size: string; screens: number; primary: string; overflow: number };

async function capture(browser: Browser, out: string, sizes: Size[]) {
  console.log("Building…");
  await build({ root: ROOT, logLevel: "warn" });
  const server = await preview({ root: ROOT, logLevel: "warn", preview: { port: 4317 } });
  const base = server.resolvedUrls!.local[0]!.replace(/\/$/, "");
  const dir = join(SHOTS, out);
  await rm(dir, { recursive: true, force: true });
  const rows: Row[] = [];
  try {
    for (const size of sizes) {
      console.log(`${size.name}…`);
      await mkdir(join(dir, size.name), { recursive: true });
      rows.push(...(await playThrough(browser, base, size, join(dir, size.name))));
    }
  } finally {
    await server.close();
  }
  await writeFile(join(dir, "report.md"), report(rows, sizes));
  console.log(`Saved ${rows.length} screenshots to shots/${out}/ (report: shots/${out}/report.md)`);
}

async function playThrough(browser: Browser, base: string, size: Size, dir: string): Promise<Row[]> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.mobile ?? false,
    hasTouch: size.mobile ?? false,
    reducedMotion: "reduce",
  });
  // Same rounds every run: seed Math.random (mulberry32) before any app code runs.
  await context.addInitScript((seed: number) => {
    let a = seed >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, SEED);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.clock.install({ time: new Date("2026-10-16T09:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-16T09:00:01Z"));

  const rows: Row[] = [];
  let n = 0;
  const shot = async (name: string, primary: string | null = ".btn--primary", full = true) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, 0));
    const file = `${String(++n).padStart(2, "0")}-${name}`;
    rows.push({ shot: file, size: size.name, ...(await measure(page, primary)) });
    // What the player sees first, with the sticky ActionBar where it really sits.
    await page.screenshot({ path: join(dir, `${file}.png`), animations: "disabled" });
    if (!full) return;
    // The whole page. A full-page capture would freeze the sticky bar mid-page over the content, so lay it out at
    // the end of the page instead, and mark the fold (the bottom of the first viewport) with a dashed line.
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        "beforeend",
        `<style data-shots>.action-bar{position:static!important}</style>` +
          `<div data-shots style="position:absolute;left:0;right:0;top:${innerHeight}px;z-index:99;` +
          `border-top:3px dashed #ff2bd6;pointer-events:none"></div>`,
      ),
    );
    await page.screenshot({ path: join(dir, `${file}.full.png`), fullPage: true, animations: "disabled" });
    await page.evaluate(() => {
      for (const e of document.querySelectorAll("[data-shots]")) e.remove();
    });
  };
  // A real click; if something covers the button (a layout bug the report should show), say so and press it anyway.
  const click = async (name: string) => {
    const button = page.getByRole("button", { name }).first();
    await button.click({ timeout: 5000 }).catch(async () => {
      console.warn(`  ${size.name}: "${name}" is covered; pressing it from the keyboard`);
      await button.focus();
      await page.keyboard.press("Enter");
    });
  };
  const tick = (ms: number) => page.clock.runFor(ms);

  await page.goto(base + "/");
  await page.getByRole("button", { name: S.landing.solo }).waitFor();
  await shot("landing");

  await click(S.landing.solo);
  await shot("intro");
  await click(S.intro.next);
  await shot("intro-2");
  await click(S.intro.go);
  await shot("huddle");
  await pickFromKeyboard(page);
  await shot("huddle-selected");
  await checkSheet(page, S.rule.explain, "huddle-rule-sheet", shot);

  await click(S.plan.lock);
  // A mix of pumps for a spread of outcomes; the last round times out ("Too slow").
  const act2Keys = "cacaaccacac";
  await playBatch(
    page,
    "act2",
    async (i) => (act2Keys[i] ? (await page.keyboard.press(act2Keys[i]!), true) : false),
    shot,
    tick,
  );
  await shot("act2-readout");
  await click(S.readout.cases);
  await shot("act2-readout-cases");
  await click(S.readout.report);
  await shot("engineering-report");
  await click(S.ceiling.go);
  await shot("tool-reveal");
  await click(S.tool.go);
  await shot("tuning");
  await checkSheet(page, S.crew.seeDials, "tuning-crew-dials", shot);

  for (let batch = 1; ; batch++) {
    await click(S.tuning.start(batch));
    await playBatch(page, batch === 1 ? "act3" : null, async () => (await page.keyboard.press("Space"), true), shot, tick);
    if (await page.getByRole("button", { name: S.readout.debrief, exact: true }).isVisible()) break;
    if (batch >= 4) throw new Error("debrief never unlocked");
    await click(S.readout.again3);
    // Back at tuning after a batch under 80%: engineering's hint is on offer.
    if (batch === 1) {
      await shot("tuning-retune");
      await checkSheet(page, S.tuning.hintButton, "tuning-hint", shot);
    }
  }
  await shot("act3-readout");
  await click(S.readout.debrief);
  for (let step = 0; step < S.debrief.steps.length; step++) {
    await shot(`debrief-${step + 1}`);
    if (step < S.debrief.steps.length - 1) await click(S.debrief.next);
  }
  await checkSheet(page, S.credits.how, "debrief-art", shot);
  await click(S.debrief.home);
  await click(S.landing.credits);
  await shot("credits", null);
  await checkSheet(page, S.credits.how, "credits-art", shot);

  await context.close();
  if (errors.length) throw new Error(`page errors at ${size.name}:\n${errors.join("\n")}`);
  return rows;
}

/** One batch. With a `prefix`: screenshot the first live round, then the first result of each cause (circulating,
 *  heat carried off, purge, pressure spike, overheat, too slow) as it comes up. `answer` returns false to let the
 *  round time out. */
async function playBatch(
  page: Page,
  prefix: string | null,
  answer: (i: number) => Promise<boolean>,
  shot: (name: string, primary?: string | null) => Promise<void>,
  tick: (ms: number) => Promise<void>,
) {
  const seen = new Set<string>();
  const causes = Object.entries(S.outcome) as [string, { title: string }][];
  await tick(LEAD_MS + 50);
  for (let i = 0; i < BATCH_SIZE; i++) {
    await page.locator(".countdown").waitFor();
    if (prefix && i === 0) await shot(`${prefix}-round`, ".pumpbtn, .measure");
    if (!(await answer(i))) await tick(ROUND_MS + 100);
    if (prefix) {
      const verdict = (await page.locator(".result__verdict").textContent()) ?? "";
      const cause = causes.find(([, o]) => verdict.includes(o.title))?.[0];
      if (cause && !seen.has(cause)) {
        seen.add(cause);
        await shot(`${prefix}-result-${cause}`);
      }
    }
    // The result waits for the player: tap Next round, press Enter, or (every third round) let it auto-advance.
    const how = i % 3;
    if (how === 0) await page.getByRole("button", { name: S.batch.next }).click();
    else if (how === 1) await page.keyboard.press("Enter");
    else await tick(RESULT_AUTO_MS + 50);
    await page.locator(".result").waitFor({ state: "detached" });
  }
  await page.getByRole("heading", { level: 1 }).waitFor();
  if (prefix) console.log(`  ${prefix} results seen: ${[...seen].join(", ")}`);
}

/** In the "Your plan" box: arrow down from the checked plan. That should select "Reverse when HOT". */
async function pickFromKeyboard(page: Page) {
  const box = page.getByRole("radiogroup", { name: S.plan.yourBox });
  await box.locator('[aria-checked="true"]').focus();
  await page.keyboard.press("ArrowDown");
  const checked = (await box.locator('[aria-checked="true"]').getAttribute("aria-label")) ?? "";
  if (!checked.startsWith(S.plans.name[1]!)) throw new Error(`huddle: keyboard pick checked "${checked}"`);
}

/** If the screen has this button: open its sheet, screenshot it, check focus stays inside on Tab, Escape closes it
 *  and focus comes back to the button. */
async function checkSheet(
  page: Page,
  opener: string,
  name: string,
  shot: (name: string, primary?: string | null, full?: boolean) => Promise<void>,
) {
  const button = page.getByRole("button", { name: opener });
  if (!(await button.count())) return;
  await button.first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.waitFor();
  await shot(name, null, false);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"));
    if (!inside) throw new Error(`${name}: focus left the sheet on Tab`);
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const back = await page.evaluate(() => document.activeElement?.textContent ?? "");
  if (!back.includes(opener)) throw new Error(`${name}: focus went to "${back}", not "${opener}"`);
}


async function measure(page: Page, primary: string | null) {
  const ringPx = (await page.evaluate(RING_TEXT)) as number | null;
  if (ringPx !== null && ringPx < 12) throw new Error(`ring text renders at ${ringPx.toFixed(1)}px (< 12px)`);
  return page.evaluate((sel) => {
    const doc = document.documentElement;
    const screens = Math.round((doc.scrollHeight / innerHeight) * 100) / 100;
    const overflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
    let inView = "—";
    if (sel) {
      const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
      const r = el?.getBoundingClientRect();
      inView = !r ? "missing" : r.bottom <= innerHeight ? "yes" : "no";
    }
    return { screens, primary: inView, overflow };
  }, primary);
}

function report(rows: Row[], sizes: Size[]) {
  const shots = [...new Set(rows.map((r) => r.shot))];
  const cell = (r: Row | undefined) =>
    !r ? "" : `${r.screens} · ${r.primary}${r.overflow ? ` · ⚠ ${r.overflow}px wide` : ""}`;
  return [
    "# Screen report",
    "",
    "Each cell: page height in screen-heights · primary action visible without scrolling · horizontal overflow (if any).",
    "",
    `| Screen | ${sizes.map((s) => s.name).join(" | ")} |`,
    `| --- | ${sizes.map(() => "---").join(" | ")} |`,
    ...shots.map((s) => `| ${s} | ${sizes.map((z) => cell(rows.find((r) => r.shot === s && r.size === z.name))).join(" | ")} |`),
    "",
  ].join("\n");
}

// ---------- compare ----------

async function compare(browser: Browser, before: string, after: string) {
  const out = join(SHOTS, `compare-${before}-${after}`);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const sizes = SIZES.map((s) => s.name);
  // One entry per screen: the full-page image (with the fold line) where there is one, else the viewport image.
  const names = async (d: string) => {
    const files = await readdir(join(SHOTS, d, sizes[0]!)).catch(() => [] as string[]);
    return files.filter((f) => f.endsWith(".full.png") || !files.includes(f.replace(/\.png$/, ".full.png")));
  };
  const key = (f: string) => f.replace(/^\d+-/, "").replace(/(\.full)?\.png$/, "");
  const b = await names(before);
  const a = await names(after);
  const all = [...new Set([...a, ...b].map(key))];
  const order = (f: string) => a.map(key).indexOf(f) + 1 || b.map(key).indexOf(f) + 1;
  all.sort((x, y) => order(x) - order(y));

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const widths = [380, 340, 180];
  for (const [i, name] of all.entries()) {
    const img = (set: string, files: string[], size: string, w: number) => {
      const f = files.find((x) => key(x) === name);
      return f
        ? `<img style="width:${w}px" src="${pathToFileURL(join(SHOTS, set, size, f)).href}">`
        : `<div class="none" style="width:${w}px">not in ${set}</div>`;
    };
    const row = (label: string, set: string, files: string[]) =>
      `<div class="row"><div class="label">${label}</div>${sizes.map((s, j) => img(set, files, s, widths[j]!)).join("")}</div>`;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#111;color:#ddd;font:14px system-ui;padding:16px}
      h1{font-size:16px;margin:0 0 12px} .row{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}
      .label{width:56px;font-weight:700} img{display:block;border:1px solid #444}
      .none{height:120px;border:1px dashed #555;display:grid;place-items:center;color:#888}
      .sizes{display:flex;gap:16px;margin-left:72px;margin-bottom:6px;color:#999}
    </style><h1>${name}</h1>
    <div class="sizes">${sizes.map((s, j) => `<span style="width:${widths[j]}px">${s}</span>`).join("")}</div>
    ${row("Before", before, b)}${row("After", after, a)}`;
    const file = join(out, `_${name}.html`);
    await writeFile(file, html);
    await page.goto(pathToFileURL(file).href);
    await page.waitForLoadState("load");
    await page.screenshot({ path: join(out, `${String(i + 1).padStart(2, "0")}-${name}.png`), fullPage: true });
    await rm(file);
  }
  await page.close();
  console.log(`Saved ${all.length} contact sheets to ${out}`);
}
