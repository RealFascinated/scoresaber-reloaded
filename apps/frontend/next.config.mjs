import { withSentryConfig } from "@sentry/nextjs";
import { format } from "@formkit/tempo";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    webpackMemoryOptimizations: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.scoresaber.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.GIT_REV || "dev",
    NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
    }),
    NEXT_PUBLIC_BUILD_TIME_SHORT: format(new Date(), {
      date: "short",
      time: "short",
    }),
  },
};

export default withSentryConfig(nextConfig, {
  org: "scoresaber-reloaded",
  project: "frontend",
  sentryUrl: "https://glitchtip.fascinated.cc/",
  silent: !process.env.CI,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  sourcemaps: {
    disable: true,
  },
  release: {
    create: false,
    finalize: false,
  },
});