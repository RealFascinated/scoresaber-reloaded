import { PreloadResources } from "@/components/preload-resources";
import type { Metadata } from "next";
import localFont from "next/font/local";
import BackgroundImage from "../components/background-image";
import DatabaseLoader from "../components/loaders/database-loader";
import NavBar from "../components/navbar/navbar";
import { QueryProvider } from "../components/providers/query-provider";
import { ThemeProvider } from "../components/providers/theme-provider";
import { Toaster } from "../components/ui/toaster";
import { TooltipProvider } from "../components/ui/tooltip";
import "./globals.css";

const siteFont = localFont({
  src: "./fonts/JetBrainsMono-Regular.woff2",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "ScoreSaber Reloaded",
    template: "SSR - %s",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${siteFont.className} antialiased w-full h-full relative`}>
        <DatabaseLoader>
          <Toaster />
          <BackgroundImage />
          <PreloadResources />
          <TooltipProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
              <QueryProvider>
                <main className="z-[9999] m-auto flex h-screen flex-col items-center md:max-w-[1200px]">
                  <NavBar />
                  {children}
                </main>
              </QueryProvider>
            </ThemeProvider>
          </TooltipProvider>
        </DatabaseLoader>
      </body>
    </html>
  );
}
