FROM oven/bun:1.2.15-alpine AS base

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --filter '@ssr/common' --filter 'backend' --filter './'

# Run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV APP_ENV backend

# Copy the depends
COPY --from=depends /app/package.json* /app/bun.lock* ./
COPY --from=depends /app/node_modules ./node_modules

# Build the common library
COPY --from=depends /app/projects/common ./projects/common
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Copy the backend project
COPY --from=depends /app/projects/backend ./projects/backend

# Lint before starting
RUN bun run --filter 'backend' lint

# Build the backend
RUN bun run --filter 'backend' build

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

WORKDIR /app/projects/backend
CMD ["bun", "--smol", "dist/index.js"]

