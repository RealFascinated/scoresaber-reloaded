FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

# Install dependencies and build the app
FROM base AS builder
WORKDIR /app
COPY package.json* pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --quiet --filter backend
COPY ./backend .
RUN pnpm run build

# Final stage to run the app
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["pnpm", "start"]