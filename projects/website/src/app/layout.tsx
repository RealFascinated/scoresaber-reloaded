import { Colors } from "@/common/colors";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageTransitionProvider } from "@/contexts/page-transition-context";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import { domAnimation, LazyMotion } from "framer-motion";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ReactNode } from "react";
import "./styles/globals.css";

const siteFont = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  weight: "100 300",
});

const siteName = env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName;
const siteUrl = env.NEXT_PUBLIC_WEBSITE_URL ?? ssrConfig.siteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: ssrConfig.siteTitleTemplate,
  },
  applicationName: siteName,
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
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-512x512.png",
  },
  openGraph: {
    siteName,
    title: siteName,
    description:
      "ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your plays",
    url: siteUrl,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description:
      "ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your plays",
    images: ["/icon-512x512.png"],
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
            strategy="afterInteractive"
            src={env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL}
            data-website-id={env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID}
          />
        )}
        <Toaster />
        <LazyMotion features={domAnimation} strict>
          <PageTransitionProvider>
            <QueryProvider>
              <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            </QueryProvider>
          </PageTransitionProvider>
        </LazyMotion>
      </body>
    </html>
  );
}
