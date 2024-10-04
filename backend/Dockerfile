# Stage 1: Builder
FROM node:20-alpine3.17 AS builder

# Install pnpm globally
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

WORKDIR /app

# Copy necessary files for installation
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY common ./common
COPY backend ./backend

# Install dependencies for all workspaces, including backend
RUN pnpm install

# Build the backend
RUN pnpm --filter backend build

# Stage 2: Runner
FROM node:20-alpine3.17 AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./backend/package.json

# Install production dependencies
RUN npm install -g pnpm && pnpm install --prod

# Expose the port your application runs on
EXPOSE 8080

# Command to run your app
CMD ["node", "dist/main.js"]
