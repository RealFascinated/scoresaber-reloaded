import { ApiHealth } from "@/components/api/api-health";
import BackgroundCover from "@/components/background-cover";
import { SnowBackground } from "@/components/effects/snow-background";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar/navbar";
import { SearchProvider } from "@/components/providers/search-provider";
import SSRLayout from "@/components/ssr-layout";
import { ReactNode } from "react";
import { getBuildInformation } from "@/common/website-utils";

export default function Layout({ children }: { children: ReactNode }) {
  const { buildId, buildTimeShort } = getBuildInformation();

  return (
    <>
      <BackgroundCover />
      <SnowBackground />
      <ApiHealth />
      <main className="flex flex-col min-h-screen text-white w-full">
        <SearchProvider>
          <Navbar />
          <SSRLayout className="pt-2">{children}</SSRLayout>
        </SearchProvider>
      </main>
      <Footer buildId={buildId} buildTimeShort={buildTimeShort} />
    </>
  );
}
