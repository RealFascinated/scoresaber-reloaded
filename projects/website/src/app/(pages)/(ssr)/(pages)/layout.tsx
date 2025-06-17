import { getBuildInformation } from "@/common/website-utils";
import { ApiHealth } from "@/components/api/api-health";
import BackgroundCover from "@/components/background-cover";
import { SnowBackground } from "@/components/effects/snow-background";
import Footer from "@/components/footer";
import DatabaseLoader from "@/components/loaders/database-loader";
import MeowMeow from "@/components/meow-meow";
import Navbar from "@/components/navbar/navbar";
import { SearchProvider } from "@/components/providers/search-provider";
import SSRLayout from "@/components/ssr-layout";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { buildId, buildTimeShort } = getBuildInformation();

  return (
    <DatabaseLoader>
      <MeowMeow />
      <BackgroundCover />
      <SnowBackground />
      <ApiHealth />
      <main className="flex min-h-screen w-full flex-col text-white">
        <SearchProvider>
          <Navbar />
          <SSRLayout className="flex flex-col gap-2 px-2 pt-2">{children}</SSRLayout>
        </SearchProvider>
      </main>
      <Footer buildId={buildId} buildTimeShort={buildTimeShort} />
    </DatabaseLoader>
  );
}
