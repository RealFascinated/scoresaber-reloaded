FROM fascinated/docker-images:nodejs_20_with_pnpm
WORKDIR /app

COPY . .

RUN pnpm install --filter backend
RUN pnpm run build:backend

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 8080

CMD ["pnpm", "start:backend"]