import "../../globals.css";
import { PreloadResources } from "@/components/preload-resources";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import DatabaseLoader from "../../../components/loaders/database-loader";
import { Colors } from "@/common/colors";
import OfflineNetwork from "@/components/offline-network";
import Script from "next/script";
import { ApiHealth } from "@/components/api/api-health";
import { SearchProvider } from "@/components/providers/search-provider";
import SSRLayout from "@/components/ssr-layout";
import { ReactNode } from "react";

const siteFont = localFont({
  src: "../../fonts/JetBrainsMono.ttf",
  weight: "100 300",
});

export const metadata: Metadata = {
  title: {
    default: "ScoreSaber Reloaded",
    template: "%s - ScoreSaber Reloaded",
  },
  applicationName: "ScoreSaber Reloaded",
};

export const viewport: Viewport = {
  themeColor: Colors.primary,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${siteFont.className} antialiased w-full h-full`}>
        <Script defer data-domain="ssr.fascinated.cc" src="https://analytics.fascinated.cc/js/script.js" />
        <DatabaseLoader>
          <Toaster />
          <PreloadResources />
          <TooltipProvider delayDuration={250}>
            <OfflineNetwork>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                <QueryProvider>
                  <ApiHealth />
                  <main className="flex flex-col min-h-screen text-white w-full">
                    <SearchProvider>
                      <SSRLayout className="pt-2">{children}</SSRLayout>
                    </SearchProvider>
                  </main>
                </QueryProvider>
              </ThemeProvider>
            </OfflineNetwork>
          </TooltipProvider>
        </DatabaseLoader>
      </body>
    </html>
  );
}
