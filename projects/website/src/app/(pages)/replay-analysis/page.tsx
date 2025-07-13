import ReplayAnalysisPageData from "@/components/replay-analysis/page-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Replay Analysis",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Replay Analysis",
    description: "Analyze replays and get insights about your performance!",
  },
};

export default async function ReplayAnalysisPage() {
  return (
    <main className="flex w-full flex-col items-center text-sm">
      <ReplayAnalysisPageData />
    </main>
  );
}
