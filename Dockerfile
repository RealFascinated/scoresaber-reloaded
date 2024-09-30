FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

# Install dependencies, including Python and build tools
FROM base AS deps
# Install necessary packages for canvas
RUN apk add --no-cache libc6-compat python3 make g++ gcc pkgconfig pixman cairo-dev libjpeg-turbo-dev pango-dev giflib-dev
WORKDIR /app
COPY package.json* pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --quiet

# Build from source
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Build the app
RUN pnpm run build

# Run the app
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache python3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["pnpm", "start"]
