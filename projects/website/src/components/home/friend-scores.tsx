"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import Card from "../card";
import { useQuery } from "@tanstack/react-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Pagination from "../input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useCallback, useEffect, useState } from "react";
import Score from "../score/score";
import { randomString } from "@ssr/common/utils/string.util";
import Avatar from "../avatar";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { motion, useAnimation } from "framer-motion";
import { scoreAnimation } from "@/components/score/score-animation";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Page } from "@ssr/common/pagination";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { LoadingIcon } from "../loading-icon";

export function FriendScores() {
  const isMobile = useIsMobile();
  const settings = useDatabase();
  const friendIds = useLiveQuery(async () => settings.getFriendIds());
  const controls = useAnimation();

  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [scoreData, setScoreData] = useState<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>();

  const { data, isLoading } = useQuery({
    queryKey: ["friend-scores", friendIds, page],
    queryFn: async () => ssrApi.getFriendScores(friendIds!, page),
    enabled: friendIds !== undefined && friendIds.length > 0,
  });

  // Handle score animation
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= page ? "hiddenRight" : "hiddenLeft");
    setScoreData(data);
    await controls.start("visible");
  }, [controls, previousPage, page, data]);

  // Trigger animation when data changes
  useEffect(() => {
    if (data) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation]);

  return (
    <Card className="h-fit flex flex-col gap-2">
      <div>
        <p className="font-bold">Friend Scores</p>
        <p className="text-sm text-gray-500">The 100 most recent scores from your friends.</p>
      </div>

      {/* No Friends */}
      {friendIds && friendIds.length === 0 && (
        <div className="flex w-full justify-center items-center">
          <p>You do not have any friends added :(</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && !scoreData && (
        <div className="flex w-full justify-center items-center">
          <LoadingIcon />
        </div>
      )}

      {/* Scores */}
      {scoreData && (
        <div className="flex flex-col gap-2">
          <>
            <motion.div
              initial="hidden"
              animate={controls}
              variants={scoreAnimation}
              className="divide-y divide-border"
            >
              {scoreData.items.map((playerScore, index) => {
                const score = playerScore.score;
                const leaderboard = playerScore.leaderboard;

                return (
                  <motion.div key={index} variants={scoreAnimation}>
                    <Score
                      score={score}
                      leaderboard={leaderboard}
                      playerAbove={score.playerInfo}
                      settings={{
                        hideLeaderboardDropdown: true,
                        hideAccuracyChanger: true,
                        noScoreButtons: true,
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>

            <Pagination
              mobilePagination={isMobile}
              page={page}
              totalItems={scoreData.metadata.totalItems}
              itemsPerPage={scoreData.metadata.itemsPerPage}
              loadingPage={isLoading ? page : undefined}
              onPageChange={newPage => {
                setPreviousPage(page);
                setPage(newPage);
              }}
              statsBelow={!isMobile}
            />
          </>
        </div>
      )}
    </Card>
  );
}
