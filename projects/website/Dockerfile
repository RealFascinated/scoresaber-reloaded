FROM oven/bun:1.2.19-debian AS base

# Set the environment
ENV NEXT_PUBLIC_APP_ENV=production

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=${SOURCE_COMMIT}

# -----------------------------------

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --filter '@ssr/common' --filter 'website' --filter './'

# Build the common library
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Build the website
RUN bun run --filter website build

# Run the app
FROM node:alpine3.22 AS runner
WORKDIR /app

RUN apk add --no-cache curl

# -----------------------------------

COPY --from=depends /app/node_modules ./node_modules

# Copy the built files
COPY --from=depends /app/projects/website/public ./public
COPY --from=depends /app/projects/website/.next/standalone/projects/website/ ./
COPY --from=depends /app/projects/website/.next/static ./.next/static

# Verify the build output
RUN ls -la

# Expose the app port
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Use the correct path to server.js
CMD ["node", "server.js"]
