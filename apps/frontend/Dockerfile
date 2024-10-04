FROM fascinated/docker-images:nodejs_20_with_pnpm

WORKDIR /app
COPY . .

RUN pnpm install

ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm i -g turbo@^2
RUN turbo prune frontend --docker
RUN turbo run build --filter=frontend

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

EXPOSE 3000

CMD node /app/apps/frontend/.next/standalone/server.js