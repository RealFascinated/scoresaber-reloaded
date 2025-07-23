import ScorePageData from "@/components/score/page/page-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Score Details",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Score Details",
    description: "View the details of a score!",
  },
};

type ScorePageProps = {
  params: Promise<{
    scoreId: string;
  }>;
};

export default async function ScorePage({ params }: ScorePageProps) {
  const { scoreId } = await params;

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <ScorePageData scoreId={scoreId} />
    </main>
  );
}
