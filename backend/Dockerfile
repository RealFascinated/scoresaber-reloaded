FROM node:20-alpine3.17

# Install pnpm
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./backend ./

RUN pnpm install --filter backend
RUN pnpm run build:backend

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 8080

CMD ["pnpm", "start:backend"]