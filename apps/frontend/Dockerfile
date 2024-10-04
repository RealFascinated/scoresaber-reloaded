FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN pnpm i -g turbo@^2
COPY . .

# Temporarily skip prune for debugging
# RUN turbo prune frontend --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache python3 make g++ gcc pkgconfig pixman cairo-dev libjpeg-turbo-dev pango-dev giflib-dev
WORKDIR /app

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm i -g turbo@^2

# Install dependencies after copying pruned lockfile
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile --quiet

# Debug step to verify pruned output
RUN ls -al /app/out/full

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=frontend...

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache cairo pango libjpeg-turbo giflib

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy build output
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

CMD node apps/frontend/server.js
