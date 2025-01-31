import { format } from "@formkit/tempo";
import type { NextConfig } from "next";
import { isProduction } from "@/common/website-utils";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isProduction() ? "standalone" : undefined,
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
      "react-hook-form",
      "@hookform/resolvers",
      "framer-motion",
    ],
    webpackMemoryOptimizations: true,
    reactCompiler: true,
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

export default nextConfig;
