import { getBuildInformation } from "@/common/website-utils";
import { ApiHealth } from "@/components/api/api-health";
import BackgroundCover from "@/components/background-cover";
import { SnowBackground } from "@/components/effects/snow-background";
import Footer from "@/components/footer";
import DatabaseLoader from "@/components/loaders/database-loader";
import MeowMeow from "@/components/meow-meow";
import Navbar from "@/components/navbar/navbar";
import { PreviewProvider } from "@/components/providers/preview-provider";
import { SearchProvider } from "@/components/providers/search-provider";
import ThemeProvider from "@/components/providers/theme-provider";
import SSRLayout from "@/components/ssr-layout";
import { SiteTheme, ssrConfig } from "config";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { buildId, buildTimeShort } = getBuildInformation();

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
          <PreviewProvider>
            <main className="flex min-h-screen w-full flex-col text-white">
              <SearchProvider>
                <Navbar />
                <SSRLayout className="flex flex-col gap-2 px-2 pt-2">{children}</SSRLayout>
              </SearchProvider>
            </main>
          </PreviewProvider>
          <Footer buildId={buildId} buildTimeShort={buildTimeShort} />
        </NuqsAdapter>
      </DatabaseLoader>
    </ThemeProvider>
  );
}
