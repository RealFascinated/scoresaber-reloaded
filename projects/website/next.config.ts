import withBundleAnalyzer from "@next/bundle-analyzer";
import { formatDate } from "@ssr/common/utils/time-utils";
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
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
  },
  modularizeImports: {
    "@heroicons/react/24/solid": { transform: "@heroicons/react/24/solid/{{member}}" },
    "@heroicons/react/24/outline": { transform: "@heroicons/react/24/outline/{{member}}" },
  },
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  env: {
    HOSTNAME: "0.0.0.0",
    NEXT_PUBLIC_BUILD_ID: process.env.SOURCE_COMMIT || "dev",
    NEXT_PUBLIC_BUILD_TIME: formatDate(new Date(), "DD MMMM YYYY HH:mm"),
    NEXT_PUBLIC_BUILD_TIME_SHORT: formatDate(new Date(), "Do MMMM, YYYY"),
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
