import { ApiHealth } from "@/components/api/api-health";
import { SnowBackground } from "@/components/effects/snow-background";
import { AppSidebar } from "@/components/layout/app-sidebar";
import DatabaseLoader from "@/components/loaders/database-loader";
import MeowMeow from "@/components/meow-meow";
import { SearchProvider } from "@/components/providers/search-provider";
import ThemeProvider from "@/components/providers/theme-provider";
import SSRLayout from "@/components/ssr-layout";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
          <SnowBackground />
          <ApiHealth />
          <SidebarProvider defaultOpen={true}>
            <SearchProvider>
              <AppSidebar />
              <SidebarInset className="text-white">
                <header className="border-border/80 bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger className="-ml-1" />
                </header>
                <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 py-4 sm:px-4">
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
