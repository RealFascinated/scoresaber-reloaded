import { Colors } from "@/common/colors";
import DatabaseLoader from "@/components/loaders/database-loader";
import OfflineNetwork from "@/components/offline-network";
import { PreloadResources } from "@/components/preload-resources";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Config } from "@ssr/common/config";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ReactNode } from "react";
import "../../globals.css";

const siteFont = localFont({
  src: "../../fonts/JetBrainsMono.ttf",
  weight: "100 300",
});

export const metadata: Metadata = {
  title: {
    default: Config.websiteName,
    template: "%s - ScoreSaber Reloaded",
  },
  applicationName: Config.websiteName,
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
    siteName: Config.websiteName,
    title: Config.websiteName,
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
  themeColor: Colors.primary,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${siteFont.className} antialiased w-full h-full`}>
        {/*<Script src="https://unpkg.com/react-scan/dist/auto.global.js" async />*/}
        <Script
          defer
          data-domain="ssr.fascinated.cc"
          src="https://analytics.fascinated.cc/js/script.js"
        />
        <DatabaseLoader>
          <Toaster />
          <PreloadResources />
          <TooltipProvider delayDuration={250}>
            <OfflineNetwork>
              <QueryProvider>{children}</QueryProvider>
            </OfflineNetwork>
          </TooltipProvider>
        </DatabaseLoader>
      </body>
    </html>
  );
}
