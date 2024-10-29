import { withSentryConfig } from "@sentry/nextjs";
import { format } from "@formkit/tempo";
import nextBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { isProduction } from "@/common/website-utils";

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

const config = withBundleAnalyzer(nextConfig);
export default isProduction()
  ? withSentryConfig(config, {
      org: "fascinatedcc",
      project: "scoresaber-reloaded",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      reactComponentAnnotation: {
        enabled: true,
      },
      hideSourceMaps: true,
      disableLogger: true,
    })
  : config;
