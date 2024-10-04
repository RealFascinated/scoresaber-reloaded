FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

# Install dependencies and build the app
FROM base AS builder
WORKDIR /app
COPY package.json* pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --quiet --filter backend
COPY . .
RUN pnpm run build --filter backend

# Final stage to run the app
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
CMD ["pnpm", "start:backend"]