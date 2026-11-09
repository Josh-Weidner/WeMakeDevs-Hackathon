# syntax=docker/dockerfile:1 hi
# Build context: repo root.  docker build -f apps/api/Dockerfile -t confy-api:<tag> .
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @confy/shared build && pnpm --filter @confy/api build
# Self-contained prod bundle: dist + prod node_modules (workspace deps copied in).
RUN pnpm --filter @confy/api deploy --prod /out

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "--import", "@confy/shared/telemetry/register", "dist/main.js"]
