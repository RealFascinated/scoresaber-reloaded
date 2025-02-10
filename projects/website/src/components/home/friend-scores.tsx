"use client";

import { scoreAnimation } from "@/components/score/score-animation";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { LoadingIcon } from "../loading-icon";
import Score from "../score/score";

export function FriendScores() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const friendIds = useLiveQuery(async () => database.getFriendIds(true));
  const controls = useAnimation();

  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [scoreData, setScoreData] =
    useState<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>();

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
        <p className="text-sm text-gray-400">
          The 100 most recent scores from your friends. Score ranks aren&apos;t available as this is
          based on cached data
        </p>
      </div>

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
                const beatSaverMap = playerScore.beatSaver;
                return (
                  <motion.div key={index} variants={scoreAnimation}>
                    <Score
                      score={score}
                      leaderboard={leaderboard}
                      beatSaverMap={beatSaverMap}
                      playerAbove={score.playerInfo}
                      settings={{
                        hideLeaderboardDropdown: true,
                        hideAccuracyChanger: true,
                        noScoreButtons: true,
                        hideRank: true,
                        allowLeaderboardPreview: true,
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
            />
          </>
        </div>
      )}
    </Card>
  );
}
