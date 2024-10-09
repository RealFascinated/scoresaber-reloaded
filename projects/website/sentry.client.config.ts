// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://69aed8b4a32e45db8fcb1b4285b4370f@glitchtip.fascinated.cc/13",
  tracesSampleRate: 0.1,
  debug: false,
  enabled: process.env.NODE_ENV === "production",
});
