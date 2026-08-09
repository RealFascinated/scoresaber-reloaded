import { TopScoresData } from "@/components/platform/scoresaber/score/top/top-scores-data";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Top Scores",
    description: "View the top scores set by players on ScoreSaber.",
    images: ["/icon-512x512.png"],
  },
};

export default async function TopScoresPage() {
  return (
    <section className="w-full">
      <TopScoresData />
    </section>
  );
}
