import { cn } from "@/common/utils";
import Card from "@/components/card";
import ScoreSongInfo from "@/components/score/score-song-info";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import RankingRequestToken from "@ssr/common/types/token/scoresaber/ranking-request-token";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function RankingQueue() {
  const { data: rankingRequests, isLoading } = useQuery({
    queryKey: ["ranking-queue"],
    queryFn: async () =>
      ApiServiceRegistry.getInstance().getScoreSaberService().lookupRankingRequests(),
  });
  const [showOpenRankUnrank, setShowOpenRankUnrank] = useState(false);

  const renderRequests = (name: string, requests: RankingRequestToken[]) => {
    return (
      <Card className="flex flex-col gap-(--spacing-lg)">
        <h3 className="text-lg font-semibold">{name}</h3>

        <div className="flex flex-col gap-(--spacing-sm)">
          {requests.map((rankingRequest, index) => {
            const leaderboard = getScoreSaberLeaderboardFromToken(rankingRequest.leaderboardInfo);
            return (
              <div key={index}>
                <Link
                  href={`/leaderboard/${leaderboard.id}`}
                  className="bg-accent-deep hover:bg-accent-deep/50 grid items-center gap-2 rounded-md p-1.5 transition-all lg:grid-cols-[1fr_0.22fr]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ScoreSongInfo
                      song={{
                        name: leaderboard.fullName,
                        authorName: leaderboard.songAuthorName,
                        art: leaderboard.songArt,
                      }}
                      level={{
                        authorName: leaderboard.levelAuthorName,
                        difficulty: leaderboard.difficulty.difficulty,
                      }}
                      imageSize={58}
                      clickableSongName={false}
                    />
                  </div>
                  <div className="flex flex-row-reverse items-center justify-between text-sm lg:flex-col lg:justify-end lg:gap-1">
                    <p>{rankingRequest.difficultyCount} Difficulties</p>
                    <p className="text-gray-400">{timeAgo(new Date(rankingRequest.created_at))}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex w-full justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-(--spacing-lg)">
      {renderRequests("Next in Queue", rankingRequests?.nextInQueue || [])}

      <Button
        variant="secondary"
        className="w-fit gap-(--spacing-sm)"
        onClick={() => setShowOpenRankUnrank(!showOpenRankUnrank)}
      >
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            showOpenRankUnrank ? "rotate-180" : ""
          )}
        />
        {(showOpenRankUnrank ? "Show" : "Hide") + " All Requests"}
      </Button>

      {showOpenRankUnrank &&
        renderRequests("Open rank/unrank requests", rankingRequests?.openRankUnrank || [])}
    </div>
  );
}
