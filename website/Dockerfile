# Base image with Node.js 20 and pnpm
FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

# Install build tools for canvas (Python, GCC, etc.)
FROM base AS deps
RUN apk add --no-cache python3 make g++ gcc pkgconfig pixman cairo-dev libjpeg-turbo-dev pango-dev giflib-dev
WORKDIR /app

# Copy frontend package and lock files only
COPY ./frontend/package.json* ./frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --quiet

# Build stage
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all necessary files from both ./frontend and ./
# This ensures you have access to both frontend code and shared types in root
COPY ./frontend ./frontend

# Install runtime dependencies
RUN apk add --no-cache cairo pango libjpeg-turbo giflib

# Build the frontend app
WORKDIR /app/frontend
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
RUN mkdir /app/frontend/.next
RUN chown nextjs:nodejs /app/frontend/.next

# Copy built files from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/package.json ./frontend/package.json
COPY --from=builder --chown=nextjs:nodejs /app/frontend/next.config.mjs ./frontend/next.config.mjs

# Switch to non-root user
USER nextjs

# Expose the app port and start it
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["pnpm", "start"]
