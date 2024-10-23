FROM oven/bun:1.1.32-alpine AS base

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Run the app
FROM base AS runner
WORKDIR /app

# Set the environment
ENV NODE_ENV production
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Copy the depends
COPY --from=depends /app/package.json* /app/bun.lockb* ./
COPY --from=depends /app/node_modules ./node_modules

# Build the common library
COPY --from=depends /app/projects/common ./projects/common
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Copy the website project
COPY --from=depends /app/projects/website ./projects/website

# Build the website
RUN bun run  --filter website build

# Expose the app port
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["bun", "run", "--filter", "website", "start"]
