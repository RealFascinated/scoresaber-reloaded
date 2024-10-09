FROM oven/bun:1.1.30-alpine AS base

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=depends /app/projects/common ./projects/common
RUN bun --filter common build

COPY --from=depends /app/node_modules ./node_modules
COPY --from=depends /app/package.json* /app/bun.lockb* ./
COPY --from=depends /app/projects/backend ./projects/backend

CMD ["bun", "run", "--filter", "backend", "start"]