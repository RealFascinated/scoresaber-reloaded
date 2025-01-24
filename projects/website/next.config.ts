import { format } from "@formkit/tempo";
import type { NextConfig } from "next";
import { isProduction } from "@/common/website-utils";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isProduction() ? "standalone" : undefined,
  experimental: {
    optimizePackageImports: ["@ssr/common", "@radix-ui/react-icons", "chart.js", "react-chartjs-2"],
    webpackMemoryOptimizations: true,
    reactCompiler: true,
  },
  poweredByHeader: false,
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
