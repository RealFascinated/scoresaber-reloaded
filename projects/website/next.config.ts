import { format } from "@formkit/tempo";
import type { NextConfig } from "next";
import { isProduction } from "@/common/website-utils";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isProduction() ? "standalone" : undefined,
  cacheMaxMemorySize: 0,
  experimental: {
    optimizePackageImports: [
      "@ssr/common",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-icons",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "chart.js",
      "react-chartjs-2",
      "lucide-react",
      "@heroicons/react",
      "@uidotdev/usehooks",
      "tailwind-merge",
      "@tanstack/react-query",
      "zustand",
      "@hookform/resolvers",
      "framer-motion",
      "react-icons",
    ],
    reactCompiler: true,
  },
  modularizeImports: {
    // "@radix-ui/react-icons": { transform: "@radix-ui/react-icons/dist/{{member}}" },
    "@heroicons/react/24/solid": { transform: "@heroicons/react/24/solid/{{member}}" },
    "@heroicons/react/24/outline": { transform: "@heroicons/react/24/outline/{{member}}" },
  },
  poweredByHeader: false,
  images: {
    unoptimized: true, // Always use unoptimized images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.scoresaber.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.beatsaver.com",
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

export default withSentryConfig(nextConfig, {
  sourcemaps: {
    disable: true,
  },
  telemetry: false,
});

