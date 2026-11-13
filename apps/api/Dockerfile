# MivaCampus API: monorepo build (context: repository root)
# build: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=dependencies /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=dependencies /app/packages/contracts/node_modules /app/packages/contracts/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
WORKDIR /app/packages/contracts
RUN pnpm build
WORKDIR /app/apps/api
RUN pnpm db:generate && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8089
EXPOSE 8089
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json apps/api/prisma7.config.ts ./apps/api/

WORKDIR /app/apps/api
USER node
# Apply committed migrations on boot, then start the app. The baseline
# migration is marked applied in the dev database; fresh databases replay it.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
