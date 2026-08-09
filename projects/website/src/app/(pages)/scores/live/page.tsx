import ScoreFeed from "@/components/platform/scoresaber/score/score-feed/score-feed";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Scores",
  description: "Watch scores as they are set on ScoreSaber in real time.",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Live Scores",
    description: "Watch scores as they are set on ScoreSaber in real time.",
    images: ["/icon-512x512.png"],
  },
};

export default function ScoresLivePage() {
  return (
    <section className="w-full">
      <ScoreFeed />
    </section>
  );
}
