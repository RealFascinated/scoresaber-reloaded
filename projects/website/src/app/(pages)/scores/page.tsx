import { Metadata } from "next";
import ScoreFeed from "@/components/score/score-feed/score-feed";
import Card from "@/components/card";

export const metadata: Metadata = {
  title: "Score Feed",
};

export default function ScoresPage() {
  return (
    <Card className="flex flex-col gap-2 w-full xl:w-[75%]">
      <div>
        <p className="font-semibold'">Live Score Feed</p>
        <p className="text-gray-400">This is the real-time scores being set on ScoreSaber.</p>
      </div>

      <ScoreFeed />
    </Card>
  );
}
