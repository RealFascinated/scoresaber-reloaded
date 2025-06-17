"use client";

import Card from "@/components/card";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import { Spinner } from "@/components/spinner";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberRankingRequestsResponse from "@ssr/common/response/scoresaber-ranking-requests-response";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const queues = [
  {
    name: "Next in queue",
    requests: (requests: ScoreSaberRankingRequestsResponse) => requests.nextInQueue,
  },
  {
    name: "Open rank/unrank",
    requests: (requests: ScoreSaberRankingRequestsResponse) => requests.openRankUnrank,
  },
];

export default function RankingQueue() {
  const { data: leaderboards, isLoading } = useQuery({
    queryKey: ["maps"],
    queryFn: async () =>
      ApiServiceRegistry.getInstance().getScoreSaberService().lookupRankingRequests(),
  });

  return (
    <Card>
      {isLoading && leaderboards == undefined && (
        <div className="flex w-full justify-center">
          <Spinner />
        </div>
      )}

      {leaderboards !== undefined && (
        <div>
          <div className="flex flex-col gap-1 pb-2">
            <div className="flex flex-col gap-1.5 border-none">
              {queues.map(queue => {
                return (
                  <div key={queue.name} className="flex flex-col gap-1.5">
                    <p>{queue.name}</p>
                    {queue.requests(leaderboards).map((rankingRequest, index) => {
                      const leaderboard = getScoreSaberLeaderboardFromToken(
                        rankingRequest.leaderboardInfo
                      );
                      return (
                        <div key={index}>
                          <Link
                            href={`/leaderboard/${leaderboard.id}`}
                            className="bg-border grid items-center gap-2 rounded-md p-1.5 transition-all hover:brightness-75 lg:grid-cols-[1fr_0.2fr]"
                          >
                            <ScoreSaberScoreSongInfo
                              leaderboard={leaderboard}
                              imageSize={58}
                              clickableSongName={false}
                            />
                            <div className="flex justify-between text-sm lg:flex-col lg:justify-end lg:gap-1">
                              <p>{rankingRequest.difficultyCount} Difficulties</p>
                              <p>{timeAgo(new Date(rankingRequest.created_at))}</p>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
