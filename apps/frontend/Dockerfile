FROM fascinated/docker-images:nodejs_20_with_pnpm

RUN apk update
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

RUN pnpm i -g turbo@^2
COPY . .

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Add the sentry auth token
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

RUN pnpm i -g turbo@^2

RUN pnpm install

RUN pnpm turbo run build --filter=frontend

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

EXPOSE 3000

COPY /app/apps/frontend/.next/standalone ./apps/frontend

CMD node /app/apps/frontend/server.js