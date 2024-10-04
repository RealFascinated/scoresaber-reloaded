FROM fascinated/docker-images:nodejs_20_with_pnpm AS base

# Install dependencies and build the app
FROM base AS builder

WORKDIR /app

COPY . .

RUN pnpm install --filter backend
RUN pnpm run build:backend

# Final stage to run the app
FROM base AS runner

WORKDIR /app

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000

CMD ["pnpm", "start:backend"]