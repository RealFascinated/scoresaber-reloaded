import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://12bd334c6e9f4499b770cdf9e6eb3757@sentry.fascinated.cc/1",
  tracesSampleRate: 0.5,
});
