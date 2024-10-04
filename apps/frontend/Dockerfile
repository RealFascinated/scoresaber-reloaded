FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

FROM base AS installer
WORKDIR /app
COPY . .

RUN pnpm install

ENV NEXT_TELEMETRY_DISABLED 1

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

RUN pnpm i -g turbo@^2
RUN turbo prune frontend --docker
RUN turbo run build --filter=frontend

FROM base AS runner

WORKDIR /app

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

EXPOSE 3000

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

CMD node /app/apps/frontend/server.js