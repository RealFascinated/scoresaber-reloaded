FROM oven/bun:1.2.2-debian AS base

# Set the environment
ENV NODE_ENV production

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
RUN bun run  --filter website build

# Run the app
FROM base AS runner
WORKDIR /app

RUN apt update
RUN apt install -y curl wget

# -----------------------------------

# Copy the built files
COPY --from=depends /app/projects/website/public ./public
COPY --from=depends /app/projects/website/.next/standalone/node_modules ./node_modules
COPY --from=depends /app/projects/website/.next/standalone/projects/website ./
COPY --from=depends /app/projects/website/.next/static ./.next/static

# Expose the app port
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["bun", "--bun", "--smol" ,"run", "server.js"]
