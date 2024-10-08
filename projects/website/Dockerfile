FROM node:20-alpine3.17 AS base

# Install pnpm
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

FROM base AS runner
WORKDIR /app

# Copy website package and lock files only
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY website ./website

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

RUN pnpm install --filter website
RUN pnpm run build:website

# Expose the app port and start it
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["pnpm", "start:website"]
