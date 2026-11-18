const local: Record<string, string> = {
  NEXT_PUBLIC_APP_ENV: "production",
  NEXT_PUBLIC_APPLICATION_NAME: "backend",
  NEXT_PUBLIC_WEBSITE_NAME: "ScoreSaber Reloaded",
  NEXT_PUBLIC_WEBSITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_CDN_URL: "http://localhost:19000",
  NEXT_PUBLIC_WEBSOCKET_URL: "ws://localhost:8080",
  NEXT_PUBLIC_API_URL: "http://localhost:8080",
  DATABASE_URL: "postgresql://test:test@localhost:55432/ssr_prof",
  DATABASE_POOL_MAX: "100",
  DATABASE_POOL_MIN: "25",
  DATABASE_POOL_IDLE_TIMEOUT_MS: "30000",
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: "2000",
  REDIS_URL: "redis://localhost:56379",
  ENABLE_QUEUES: "false",
  S3_ENDPOINT: "http://localhost:19000",
  S3_ACCESS_KEY: "minioadmin",
  S3_SECRET_KEY: "minioadmin",
  S3_REGION: "us-east-1",
  PROMETHEUS_AUTH_TOKEN: "prof",
  PROXY_URL: "http://localhost:3128",
  BETTER_AUTH_SECRET: "profiling-secret-at-least-32-characters-long",
};

for (const [key, value] of Object.entries(local)) {
  process.env[key] = value;
}
