import { Metadata } from "next";
import Card from "@/components/card";
import { kyFetch } from "@ssr/common/utils/utils";
import { Config } from "@ssr/common/config";
import { TopScoresResponse } from "@ssr/common/response/top-scores-response";
import Score from "@/components/score/score";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Top Scores",
};

export default async function TopScoresPage() {
  const scores = await kyFetch<TopScoresResponse>(`${Config.apiUrl}/scores/top`);

  return (
    <Card className="flex flex-col gap-2 w-full xl:w-[75%]">
      <div>
        <p className="font-semibold'">Top 100 ScoreSaber Scores</p>
        <p className="text-gray-400">This will only show scores that have been tracked.</p>
      </div>

      {!scores ? (
        <p>No scores found</p>
      ) : (
        <div className="flex flex-col gap-2 divide-y divide-border">
          {scores.scores.map(({ score, leaderboard, beatSaver }, index) => {
            const player = score.playerInfo;
            const name = score.playerInfo ? player.name || player.id : score.playerId;

            return (
              <div key={index} className="flex flex-col pt-2">
                <p className="text-sm">
                  Set by{" "}
                  <Link href={`/player/${player.id}`}>
                    <span className="text-ssr hover:brightness-[66%] transition-all transform-gpu">{name}</span>
                  </Link>
                </p>
                <Score
                  score={score}
                  leaderboard={leaderboard}
                  beatSaverMap={beatSaver}
                  settings={{
                    hideLeaderboardDropdown: true,
                    hideAccuracyChanger: true,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
