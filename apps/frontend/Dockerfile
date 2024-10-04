FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app

RUN pnpm i -g turbo@^2
COPY . .

RUN turbo prune frontend --docker

FROM base AS installer
WORKDIR /app

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Add the sentry auth token
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

RUN pnpm i -g turbo@^2

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN pnpm install

# Build the project
COPY --from=builder /app/out/full/ .

RUN pnpm turbo run build --filter=frontend

FROM base AS runner

WORKDIR /app

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

EXPOSE 3000

RUN pnpm install

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./apps/frontend
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

CMD node /app/apps/frontend/server.js