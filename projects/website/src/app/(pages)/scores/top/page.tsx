import { TopScoresData } from "@/components/platform/scoresaber/score/top/top-scores-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Scores",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Top Scores",
    description: "View the top scores set by players on ScoreSaber.",
  },
};

export default async function TopScoresPage() {
  return (
    <main className="flex w-full justify-center">
      <TopScoresData />
    </main>
  );
}
