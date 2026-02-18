import { Colors } from "@/common/colors";
import { PreloadResources } from "@/components/preload-resources";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { PageTransitionProvider } from "@/contexts/page-transition-context";
import { ViewportProvider } from "@/contexts/viewport-context";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { domAnimation, LazyMotion } from "framer-motion";
import { ReactNode } from "react";
import "./styles/globals.css";

const siteFont = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  weight: "100 300",
});

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_WEBSITE_NAME,
    template: ssrConfig.siteTitleTemplate,
  },
  applicationName: env.NEXT_PUBLIC_WEBSITE_NAME,
  authors: [
    {
      name: "Fascinated",
      url: "https://github.com/RealFascinated/scoresaber-reloaded",
    },
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  keywords:
    "scoresaber, score saber, scoresaber stats, score saber stats, beatleader, beat leader," +
    "scoresaber reloaded, ssr, github, score aggregation, scoresaber api, score saber api, scoresaber api," +
    "BeatSaber, Overlay, OBS, Twitch, YouTube, BeatSaber Overlay, Github, Beat Saber overlay, ScoreSaber, BeatLeader," +
    "VR gaming, Twitch stream enhancement, Customizable overlay, Real-time scores, Rankings, Leaderboard information," +
    "Stream enhancement, Professional overlay, Easy to use overlay builder.",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: env.NEXT_PUBLIC_WEBSITE_NAME,
    description:
      "ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your plays",
    url: "https://ssr.fascinated.cc",
    locale: "en_US",
    type: "website",
  },
  description:
    "ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your plays",
};

export const viewport: Viewport = {
  themeColor: Colors.secondary,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${siteFont.className} h-full w-full antialiased`}>
        {env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID && env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL && (
          <Script
            defer
            src={env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL}
            data-website-id={env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID}
          />
        )}
        <Toaster />
        <PreloadResources />
        <LazyMotion features={domAnimation} strict>
          <PageTransitionProvider>
            <ViewportProvider>
              <QueryProvider>{children}</QueryProvider>
            </ViewportProvider>
          </PageTransitionProvider>
        </LazyMotion>
      </body>
    </html>
  );
}
