import ScoreFeed from "@/components/platform/scoresaber/score/score-feed/score-feed";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Scores",
  description: "Watch scores as they are set on ScoreSaber in real time.",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Live Scores",
    description: "Watch scores as they are set on ScoreSaber in real time.",
  },
};

export default function ScoresLivePage() {
  return (
    <main className="flex w-full justify-center">
      <ScoreFeed />
    </main>
  );
}
