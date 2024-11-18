FROM oven/bun:1.1.34-alpine AS base

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    fontconfig-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    libpng-dev \
    libuuid


# Copy the depends
COPY --from=depends /app/package.json* /app/bun.lockb* ./
COPY --from=depends /app/node_modules ./node_modules

# Build the common library
COPY --from=depends /app/projects/common ./projects/common
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Copy the backend project
COPY --from=depends /app/projects/backend ./projects/backend

# Lint before starting
RUN bun --filter 'backend' lint

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

CMD ["bun", "run", "--filter", "backend", "start"]
