// Production server: one process serves the built app (dist/) and the station WebSocket on the same origin.
//   pnpm build && pnpm start      (PORT defaults to 8787; PUBLIC_URL, if set, is the join address the TV shows)
// Node runs this TypeScript directly (type stripping, Node ≥ 22.18).
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { HEALTH_PATH, STATION_INFO_PATH } from "../src/shared/protocol.ts";
import { attachStation } from "./attach.ts";
import { stationInfo } from "./joinInfo.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/ is missing: run `pnpm build` first.");
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  if (path === HEALTH_PATH) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (path === STATION_INFO_PATH) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" });
    return res.end(JSON.stringify(stationInfo(PORT)));
  }
  // Static file if it exists, else the SPA's index.html (routes like /screen and /play).
  const file = normalize(join(DIST, path));
  const isFile = file.startsWith(DIST) && existsSync(file) && statSync(file).isFile();
  const target = isFile ? file : join(DIST, "index.html");
  res.writeHead(200, {
    "content-type": TYPES[extname(target)] ?? "application/octet-stream",
    "cache-control": isFile && path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(target).pipe(res);
});

attachStation(server);
server.listen(PORT, () => {
  const info = stationInfo(PORT);
  console.log(`Quantum Crew station on http://localhost:${PORT}`);
  const join = info.publicUrl ? [info.publicUrl] : info.lanUrls;
  console.log(join.length ? `Phones join at: ${join.join("  ·  ")}` : "No network address found: phones can't reach this laptop.");
});
