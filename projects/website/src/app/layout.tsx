import "./globals.css";
import Footer from "@/components/footer";
import { PreloadResources } from "@/components/preload-resources";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import BackgroundCover from "../components/background-cover";
import DatabaseLoader from "../components/loaders/database-loader";
import NavBar from "../components/navbar/navbar";
import { Colors } from "@/common/colors";
import OfflineNetwork from "@/components/offline-network";
import Script from "next/script";

const siteFont = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  weight: "100 300",
});

export const metadata: Metadata = {
  title: {
    default: "ScoreSaber Reloaded",
    template: "%s - ScoreSaber Reloaded",
  },
  applicationName: "ScoreSaber Reloaded",
  authors: [
    {
      name: "Fascinated",
      url: "https://git.fascinated.cc/Fascinated",
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
    title: "Scoresaber Reloaded",
    description: "Scoresaber Reloaded is a new way to view your scores and get more stats about your and your plays",
    url: "https://ssr.fascinated.cc",
    locale: "en_US",
    type: "website",
  },
  description: "Scoresaber Reloaded is a new way to view your scores and get more stats about your and your plays",
};

export const viewport: Viewport = {
  themeColor: Colors.primary,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${siteFont.className} antialiased w-full h-full`}>
        <Script defer data-domain="ssr.fascinated.cc" src="https://analytics.fascinated.cc/js/script.js" />
        <DatabaseLoader>
          <Toaster />
          <BackgroundCover />
          <PreloadResources />
          <TooltipProvider delayDuration={100}>
            <OfflineNetwork>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                <QueryProvider>
                  <AnimatePresence>
                    <main className="flex flex-col min-h-screen gap-2 text-white w-full">
                      <NavBar />
                      <div className="z-[1] m-auto flex flex-col flex-grow items-center w-full md:max-w-[1600px]">
                        {children}
                      </div>
                      <Footer />
                    </main>
                  </AnimatePresence>
                </QueryProvider>
              </ThemeProvider>
            </OfflineNetwork>
          </TooltipProvider>
        </DatabaseLoader>
      </body>
    </html>
  );
}