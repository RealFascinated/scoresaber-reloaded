FROM node:20-alpine3.17

# Install pnpm globally
RUN npm install -g pnpm
ENV PNPM_HOME=/usr/local/bin

WORKDIR /app

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# Copy necessary files for installation
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY common ./common
COPY backend ./backend

# Install all dependencies (for common and backend)
RUN pnpm install

# Build the common workspace first, then the backend
RUN pnpm --filter ...common build
RUN pnpm --filter ...backend build

# Expose the port your application runs on
EXPOSE 8080

# Command to run your app
CMD ["node", "backend/dist/main.js"]
