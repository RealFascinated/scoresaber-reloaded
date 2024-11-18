# Install libuuid dependency for canvas package
FROM base AS runner
WORKDIR /app

# Install libuuid library required by the canvas package
RUN apk add --no-cache libuuid

# Existing steps to set up the app
ENV NODE_ENV production
COPY --from=depends /app/package.json* /app/bun.lockb* ./
COPY --from=depends /app/node_modules ./node_modules

# Build the common library
COPY --from=depends /app/projects/common ./projects/common
RUN bun i -g typescript
RUN bun --filter '@ssr/common' build

# Copy the backend project
COPY --from=depends /app/projects/backend ./projects/backend

# Lint before starting
RUN bun --filter 'backend' lint

ARG PORT=8080
ENV PORT $PORT
EXPOSE $PORT

CMD ["bun", "run", "--filter", "backend", "start"]
