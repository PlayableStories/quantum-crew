import react from "@vitejs/plugin-react";
import type { Server } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { attachStation } from "./server/attach.ts";
import { HEALTH_PATH, STATION_INFO_PATH } from "./src/shared/protocol.ts";
import { stationInfo } from "./server/joinInfo.ts";

/** Dev only: run the station WebSocket inside the Vite dev server, so `pnpm dev` covers solo and event mode. */
function station(): Plugin {
  return {
    name: "quantum-crew-station",
    apply: "serve",
    configureServer(server) {
      if (server.httpServer) attachStation(server.httpServer as Server);
      server.middlewares.use(HEALTH_PATH, (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      });
      // Where phones join (the TV asks): PUBLIC_URL, or this machine's LAN addresses on the dev server's port.
      server.middlewares.use(STATION_INFO_PATH, (_req, res) => {
        const address = server.httpServer?.address();
        const port = address && typeof address === "object" ? address.port : (server.config.server.port ?? 5173);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(stationInfo(port)));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), station()],
});
