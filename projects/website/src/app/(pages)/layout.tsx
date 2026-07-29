import { ApiHealth } from "@/components/api/api-health";
import BackgroundCover from "@/components/background-cover";
import { SnowBackground } from "@/components/effects/snow-background";
import DatabaseLoader from "@/components/loaders/database-loader";
import MeowMeow from "@/components/meow-meow";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SearchProvider } from "@/components/providers/search-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import ThemeProvider from "@/components/providers/theme-provider";
import SSRLayout from "@/components/ssr-layout";
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
          <MeowMeow />
          <BackgroundCover />
          <SnowBackground />
          <ApiHealth />
          <SidebarProvider defaultOpen={true}>
            <SearchProvider>
              <AppSidebar />
              <SidebarInset className="text-white">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 px-4">
                  <SidebarTrigger className="-ml-1" />
                </header>
                <div className="flex min-w-0 flex-1 flex-col px-3 py-4 sm:px-4">
                  <SSRLayout className="flex flex-col gap-2">{children}</SSRLayout>
                </div>
              </SidebarInset>
            </SearchProvider>
          </SidebarProvider>
        </NuqsAdapter>
      </DatabaseLoader>
    </ThemeProvider>
  );
}
