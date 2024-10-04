FROM fascinated/docker-images:nodejs_20_with_pnpm

RUN apk update
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

RUN pnpm i -g turbo@^2
COPY . .

# Install depends
RUN pnpm install

# Add the commit hash
ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Add the sentry auth token
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

RUN pnpm turbo run build --filter=frontend

EXPOSE 3000
CMD node /app/apps/frontend/.next/standalone/server.js