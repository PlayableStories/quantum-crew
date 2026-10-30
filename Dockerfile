# Event mode in one container: the built app and the station WebSocket on one port (see README, "Run event mode").
#   docker build -t quantum-crew .
#   docker run -p 8787:8787 -e PUBLIC_URL=https://your-host.example quantum-crew
# Rooms live in memory: run exactly one instance, and don't restart it mid-session.
FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/atlas-client/package.json packages/atlas-client/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node", "server/index.ts"]
