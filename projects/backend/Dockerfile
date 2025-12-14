FROM oven/bun:1.3.4-alpine AS base

# Install dependencies
FROM base AS depends
WORKDIR /app

# Copy workspace structure needed for dependency resolution
COPY package.json bun.lock ./
COPY projects/common/package.json ./projects/common/
COPY projects/backend/package.json ./projects/backend/
COPY projects/website/package.json ./projects/website/

# Install only production dependencies for the specific packages
RUN bun install --frozen-lockfile --production --filter '@ssr/common' --filter 'backend'

# Copy source code after dependencies are installed
COPY projects/common ./projects/common
COPY projects/backend ./projects/backend

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
RUN bun --filter '@ssr/common' build

COPY --from=depends /app/projects/backend ./projects/backend

# Lint before starting
RUN bun run --filter 'backend' lint

# Build the backend
RUN bun run --filter 'backend' build

# Type generation for OpenAPI schema
RUN bun install typescript --global
RUN bun run --filter 'backend' build:types

# Final stage - minimal runtime image
FROM base AS final
WORKDIR /app

ENV NODE_ENV production
ENV APP_ENV backend

# Copy only runtime dependencies
COPY --from=depends /app/package.json* /app/bun.lock* ./
COPY --from=depends /app/node_modules ./node_modules

# Copy built applications
COPY --from=runner /app/projects/common ./projects/common
COPY --from=runner /app/projects/backend/package.json ./projects/backend/
COPY --from=runner /app/projects/backend/ssr-backend ./projects/backend/ssr-backend

# Copy for Types used in OpenAPI schema
COPY --from=runner /app/projects/backend/src ./projects/backend/src

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

WORKDIR /app/projects/backend
CMD ["./ssr-backend"]


