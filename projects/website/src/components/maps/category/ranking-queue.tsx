"use client";

import Card from "@/components/card";
import { useQuery } from "@tanstack/react-query";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { useCallback, useEffect, useState } from "react";
import { LoadingIcon } from "@/components/loading-icon";
import Pagination from "@/components/input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import Link from "next/link";
import { useDebounce } from "@uidotdev/usehooks";
import { motion, useAnimation } from "framer-motion";
import { scoreAnimation } from "@/components/score/score-animation";
import ScoreSongInfo from "@/components/score/score-song-info";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberLeaderboardPageToken from "@ssr/common/types/token/scoresaber/leaderboard-page";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import RankingRequestToken from "@ssr/common/types/token/scoresaber/ranking-request-token";
import ScoreSaberRankingRequestsResponse from "@ssr/common/response/scoresaber-ranking-requests-response";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { timeAgo } from "@ssr/common/utils/time-utils";

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
  const controls = useAnimation();

  const [leaderboards, setLeaderboards] = useState<ScoreSaberRankingRequestsResponse | undefined>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maps"],
    queryFn: async () => scoresaberService.lookupRankingRequests(),
  });

  /**
   * Starts the animation for the scores, but only after the initial load.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start("hiddenRight");
    setLeaderboards(data);
    console.log(data);
    await controls.start("visible");
  }, [controls, data]);

  /**
   * Set the leaderboards when the data is loaded
   */
  useEffect(() => {
    if (data && !isLoading && !isError) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation, isError, isLoading]);

  return (
    <Card>
      {isLoading && leaderboards == undefined && (
        <div className="flex w-full justify-center">
          <LoadingIcon />
        </div>
      )}

      {leaderboards !== undefined && (
        <div>
          <div className="flex flex-col gap-1 pb-2">
            <motion.div
              initial="hidden"
              animate={controls}
              className="border-none flex flex-col gap-1.5"
              variants={scoreAnimation}
            >
              {queues.map(queue => {
                return (
                  <div key={queue.name} className="flex flex-col gap-1.5">
                    <p>{queue.name}</p>
                    {queue.requests(leaderboards).map((rankingRequest, index) => {
                      const leaderboard = getScoreSaberLeaderboardFromToken(rankingRequest.leaderboardInfo);
                      return (
                        <motion.div key={index} variants={scoreAnimation}>
                          <Link
                            prefetch={false}
                            href={`/leaderboard/${leaderboard.id}`}
                            className="grid lg:grid-cols-[1fr_0.2fr] gap-2 items-center bg-border p-1.5 hover:brightness-75 transition-all transform-gpu rounded-md"
                          >
                            <ScoreSongInfo leaderboard={leaderboard} imageSize={58} clickableSongName={false} />
                            <div className="text-sm flex justify-between lg:justify-end lg:flex-col lg:gap-1">
                              <p>{rankingRequest.difficultyCount} Difficulties</p>
                              <p>{timeAgo(new Date(rankingRequest.created_at))}</p>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </Card>
  );
}
