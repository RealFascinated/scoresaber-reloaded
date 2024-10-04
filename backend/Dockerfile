FROM node:20-alpine3.17

# Install pnpm globally
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

WORKDIR /app

# Copy necessary files for installation
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY common ./common
COPY backend ./backend

# Install dependencies for all workspaces, including backend
RUN pnpm install --filter ...backend

# Build the backend
RUN pnpm --filter backend build

# Expose the port your application runs on
EXPOSE 8080

# Command to run your app
CMD ["node", "dist/main.js"]
