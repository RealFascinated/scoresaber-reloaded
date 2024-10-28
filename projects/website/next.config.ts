import { withSentryConfig } from "@sentry/nextjs";
import { format } from "@formkit/tempo";
import nextBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: ["@ssr/common", "@radix-ui/react-icons", "chart.js", "react-chartjs-2"],
  },
  images: {
    unoptimized: true,
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
    HOSTNAME: "0.0.0.0",
    NEXT_PUBLIC_BUILD_ID: process.env.GIT_REV || "dev",
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

const withBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
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
  })
);
