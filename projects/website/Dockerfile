FROM oven/bun:1.3.13-debian AS base

# Set the environment
ENV NEXT_PUBLIC_APP_ENV=production

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=${SOURCE_COMMIT}

# -----------------------------------

# Install dependencies
FROM base AS depends
WORKDIR /app

# Copy workspace structure needed for dependency resolution
COPY package.json bun.lock ./
COPY projects/common/package.json ./projects/common/
COPY projects/website/package.json ./projects/website/
COPY projects/backend/package.json ./projects/backend/

# Install dependencies (including dev dependencies for build)
RUN bun install --frozen-lockfile

# Copy source code after dependencies are installed
COPY projects/common ./projects/common
COPY projects/website ./projects/website

# Build the common library
RUN cd projects/common && bun run build

# Lint website before build
RUN cd projects/website && bun run lint

# Build the website
RUN cd projects/website && bun run build

# Run the app
FROM node:alpine3.22 AS runner
WORKDIR /app

RUN apk add --no-cache curl

# -----------------------------------

COPY --from=depends /app/node_modules ./node_modules

# Copy the built filesf
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
