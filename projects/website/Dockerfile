FROM oven/bun:1.1.33-alpine AS base

# Set the environment
ENV NODE_ENV production

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

ARG REDIS_URL
ENV REDIS_URL=${REDIS_URL}

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Build the common library
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Build the website
RUN bun run  --filter website build

# Run the app
FROM base AS runner
WORKDIR /app

# Copy the built files
COPY --from=depends /app/projects/website/public ./public
COPY --from=depends /app/projects/website/.next/standalone/node_modules ./node_modules
COPY --from=depends /app/projects/website/.next/standalone/projects/website ./
COPY --from=depends /app/projects/website/.next/static ./.next/static

# Expose the app port
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "server.js"]
