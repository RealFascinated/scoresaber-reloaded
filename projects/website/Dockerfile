FROM oven/bun:1.2.7-debian AS base

# Used for health checks
RUN apt update
RUN apt install -y curl

# Set the environment
ENV NEXT_PUBLIC_APP_ENV production

ARG GIT_REV
ENV GIT_REV=${GIT_REV}

# -----------------------------------

# Install dependencies
FROM base AS depends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --filter '@ssr/common' --filter 'website' --filter './'

# Build the common library
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Build the website
RUN bun run --filter website build

# Run the app
FROM base AS runner
WORKDIR /app

# -----------------------------------

COPY --from=depends /app/node_modules ./node_modules

# Copy the built files
COPY --from=depends /app/projects/website/public ./public
COPY --from=depends /app/projects/website/.next/standalone ./
COPY --from=depends /app/projects/website/.next/static ./.next/static

# Verify the server.js file exists
RUN ls -la .next/standalone/

# Expose the app port
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Use the correct path to server.js
CMD ["bun", "--bun", "--smol", "server.js"]
