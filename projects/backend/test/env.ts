/**
 * Test environment variables. Loaded before any backend modules that read `env`.
 * Overrides connection targets when host shell env would point at non-test services.
 */
const defaults: Record<string, string> = {
  NEXT_PUBLIC_APP_ENV: "development",
  NEXT_PUBLIC_APPLICATION_NAME: "backend",
  NEXT_PUBLIC_WEBSITE_NAME: "SSR Test",
  NEXT_PUBLIC_WEBSITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_URL: "http://localhost:8080",
  NEXT_PUBLIC_CDN_URL: "http://localhost:19000",
  NEXT_PUBLIC_WEBSOCKET_URL: "ws://localhost:8080",

  DATABASE_URL: "postgresql://test:test@localhost:5433/ssr_test",
  REDIS_URL: "redis://localhost:6380",

  ENABLE_QUEUES: "false",

  S3_ENDPOINT: "http://localhost:19000",
  S3_ACCESS_KEY: "minioadmin",
  S3_SECRET_KEY: "minioadmin",
  S3_REGION: "us-east-1",

  PROMETHEUS_AUTH_TOKEN: "test-prometheus-token",
  PROXY_URL: "http://localhost:3128",
};

const forcedKeys = new Set(["DATABASE_URL", "REDIS_URL", "S3_ENDPOINT", "ENABLE_QUEUES"]);

function isConfiguredTestValue(key: string, value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  switch (key) {
    case "DATABASE_URL":
      return value.includes("ssr_test");
    case "REDIS_URL":
      return /redis:\/\/(localhost:6380|redis:6379)/.test(value);
    case "S3_ENDPOINT":
      return /localhost:19000|minio:9000/.test(value);
    case "ENABLE_QUEUES":
      return value === "true" || value === "false";
    default:
      return false;
  }
}

for (const [key, value] of Object.entries(defaults)) {
  const current = process.env[key];

  if (forcedKeys.has(key)) {
    if (!isConfiguredTestValue(key, current)) {
      process.env[key] = value;
    }
    continue;
  }

  if (current === undefined) {
    process.env[key] = value;
  }
}
