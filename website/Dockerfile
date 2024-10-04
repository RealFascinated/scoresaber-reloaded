FROM node:20-alpine3.17 AS base

# Install pnpm
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

# Install build tools for canvas (Python, GCC, etc.)
FROM base AS deps
RUN apk add --no-cache python3 make g++ gcc pkgconfig pixman cairo-dev libjpeg-turbo-dev pango-dev giflib-dev
WORKDIR /app

# Copy website package and lock files only
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile --quiet --filter website

# Build stage
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

COPY website ./website

# Install runtime dependencies
RUN apk add --no-cache cairo pango libjpeg-turbo giflib

# Build the website app
WORKDIR /app/website
RUN pnpm run build

# Final stage for running the app
FROM base AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache cairo pango libjpeg-turbo giflib

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create system user and group for running the app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Ensure necessary directories exist and are writable
RUN mkdir -p /app/website/.next
RUN chown nextjs:nodejs /app/website/.next

# Copy built files from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/website/node_modules ./website/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/website/.next ./website/.next
COPY --from=builder --chown=nextjs:nodejs /app/website/public ./website/public
COPY --from=builder --chown=nextjs:nodejs /app/website/package.json ./website/package.json
COPY --from=builder --chown=nextjs:nodejs /app/website/next.config.mjs ./website/next.config.mjs

# Switch to non-root user
USER nextjs

# Expose the app port and start it
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["pnpm", "start"]
