FROM oven/bun:1.3.14-alpine AS base

# Full dependency install (lint, build)
FROM base AS depends-dev
WORKDIR /app

COPY package.json bun.lock ./
COPY projects/common/package.json ./projects/common/
COPY projects/backend/package.json ./projects/backend/
COPY projects/website/package.json ./projects/website/

RUN bun install --frozen-lockfile

COPY projects/common ./projects/common
COPY projects/backend ./projects/backend

# Production dependency install
FROM base AS depends
WORKDIR /app

COPY package.json bun.lock ./
COPY projects/common/package.json ./projects/common/
COPY projects/backend/package.json ./projects/backend/
COPY projects/website/package.json ./projects/website/

RUN bun install --frozen-lockfile --production

COPY projects/common ./projects/common
COPY projects/backend ./projects/backend

# Lint and build
FROM depends-dev AS runner
WORKDIR /app

ENV NODE_ENV production
ENV APP_ENV backend

RUN cd projects/common && bun run build
RUN cd projects/backend && bun run lint
RUN cd projects/backend && bun run build

# Final stage - minimal runtime image
FROM base AS final
WORKDIR /app

ENV NODE_ENV production
ENV APP_ENV backend

COPY --from=depends /app/package.json* /app/bun.lock* ./
COPY --from=depends /app/node_modules ./node_modules

COPY --from=runner /app/projects/common ./projects/common
COPY --from=runner /app/projects/backend/package.json ./projects/backend/
COPY --from=runner /app/projects/backend/ssr-backend ./projects/backend/ssr-backend

# SQL migrations for startup `runMigrations()` (resolved via process.cwd()/drizzle; WORKDIR is projects/backend)
COPY --from=runner /app/projects/backend/drizzle ./projects/backend/drizzle

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

WORKDIR /app/projects/backend
CMD ["./ssr-backend"]
