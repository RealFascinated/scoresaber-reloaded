import RankingData from "@/components/ranking/ranking-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Ranking",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Ranking",
    description: "View the players from all over the world!",
  },
};

export default async function RankingPage() {
  return (
    <main className="flex w-full flex-col items-center text-sm">
      <RankingData />
    </main>
  );
}
