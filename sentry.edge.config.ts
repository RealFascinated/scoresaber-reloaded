// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://69aed8b4a32e45db8fcb1b4285b4370f@glitchtip.fascinated.cc/13",
  tracesSampleRate: 1,
  debug: false,
  enabled: process.env.NODE_ENV === "production",
});