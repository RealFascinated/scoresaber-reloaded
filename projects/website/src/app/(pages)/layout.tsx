import Announcements from "@/components/announcements/announcements";
import { ApiHealth } from "@/components/api/api-health";
import { SnowBackground } from "@/components/effects/snow-background";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import DatabaseLoader from "@/components/loaders/database-loader";
import MeowMeow from "@/components/meow-meow";
import { PlayerAndLeaderboardSearchDialog } from "@/components/navbar/player-and-leaderboard-search";
import { RealmProvider } from "@/components/providers/realm-provider";
import { SearchProvider } from "@/components/providers/search-provider";
import ThemeProvider from "@/components/providers/theme-provider";
import SSRLayout from "@/components/ssr-layout";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteTheme, ssrConfig } from "config";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={ssrConfig.themes[0].id}
      enableSystem={false}
      themes={ssrConfig.themes.map((theme: SiteTheme) => theme.id)}
    >
      <DatabaseLoader>
        <NuqsAdapter>
          <RealmProvider>
            <MeowMeow />
            <SnowBackground />
            <ApiHealth />
            <SidebarProvider defaultOpen={true}>
              <SearchProvider>
                <PlayerAndLeaderboardSearchDialog />
                <AppSidebar />
                <SidebarInset className="text-white">
                  <Announcements />
                  <AppHeader />
                  <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 pb-6 sm:px-4 md:pt-0">
                    <SSRLayout className="flex flex-col gap-2">{children}</SSRLayout>
                  </div>
                </SidebarInset>
              </SearchProvider>
            </SidebarProvider>
          </RealmProvider>
        </NuqsAdapter>
      </DatabaseLoader>
    </ThemeProvider>
  );
}
