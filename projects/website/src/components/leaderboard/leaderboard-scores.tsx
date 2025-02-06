"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Pagination from "../input/pagination";
import LeaderboardScore from "./page/leaderboard-score";
import { scoreAnimation } from "@/components/score/score-animation";
import { Button } from "@/components/ui/button";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardScoresSkeleton from "@/components/leaderboard/skeleton/leaderboard-scores-skeleton";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Metadata } from "@ssr/common/types/metadata";
import ScoreMode, { ScoreModeEnum } from "@/components/score/score-mode";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/common/utils";
import usePageNavigation from "@/hooks/use-page-navigation";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ssrApi } from "@ssr/common/utils/ssr-api";

type LeaderboardScoresProps = {
  initialPage?: number;
  initialCategory?: ScoreModeEnum;
  leaderboard: ScoreSaberLeaderboard;
  showDifficulties?: boolean;
  isLeaderboardPage?: boolean;
  leaderboardChanged?: (id: number) => void;
  disableUrlChanging?: boolean;
  highlightedPlayer?: ScoreSaberPlayer;
};

type ScoresPage = {
  scores: ScoreSaberScore[];
  metadata: Metadata;
};

export default function LeaderboardScores({
  initialPage,
  initialCategory,
  leaderboard,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
  disableUrlChanging,
  highlightedPlayer,
}: LeaderboardScoresProps) {
  if (!initialPage) {
    initialPage = 1;
  }

  const { navigateToPage } = usePageNavigation();
  const database = useDatabase();
  const claimedPlayer = useLiveQuery(() => database.getClaimedPlayer());
  const friendIds = useLiveQuery(() => database.getFriendIds());

  const isMobile = useIsMobile();
  const controls = useAnimation();

  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(
    initialCategory ?? ScoreModeEnum.Global
  );
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(leaderboard.id);
  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const filter = useLeaderboardFilter();

  const [currentScores, setCurrentScores] = useState<ScoresPage | undefined>();

  const { data, isError, isLoading } = useQuery<ScoresPage>({
    queryKey: [
      "leaderboardScores",
      selectedLeaderboardId,
      currentPage,
      selectedMode,
      filter.country,
      friendIds,
      claimedPlayer,
    ],
    queryFn: async () => {
      if (selectedMode == ScoreModeEnum.Global) {
        const leaderboard = await ssrApi.fetchLeaderboardScores<
          ScoreSaberScore,
          ScoreSaberLeaderboard
        >(selectedLeaderboardId + "", currentPage, filter.country);

        return {
          scores: leaderboard!.scores,
          metadata: leaderboard!.metadata,
        };
      } else {
        if (friendIds && claimedPlayer) {
          const friendScores = await ssrApi.getFriendLeaderboardScores(
            [...friendIds, claimedPlayer.id],
            selectedLeaderboardId + "",
            currentPage
          );
          if (friendScores) {
            const friends = await database.getFriends();

            return {
              scores: friendScores.items.map(score => {
                let friend = friends.find(f => f.id == score.playerId);
                if (!friend) {
                  if (score.playerId == claimedPlayer.id) {
                    friend = claimedPlayer;
                  }
                }

                if (!friend) {
                  return score;
                }

                score.rank = -1;
                score.playerInfo = {
                  id: score.playerId,
                  name: friend.name,
                  country: friend.country,
                  permissions: friend.permissions,
                  profilePicture: friend.avatar,
                };
                return score;
              }),
              metadata: friendScores.metadata,
            };
          }
        }
      }

      return {
        scores: [],
        metadata: {
          totalPages: 0,
          totalItems: 0,
          page: 0,
          itemsPerPage: 0,
        },
      };
    },
  });

  /**
   * Starts the animation for the scores, but only after the initial load.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= currentPage ? "hiddenRight" : "hiddenLeft");
    setCurrentScores(data);
    await controls.start("visible");
  }, [controls, currentPage, previousPage, data]);

  /**
   * Set the selected leaderboard.
   */
  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setSelectedLeaderboardId(id);
      setCurrentPage(1);

      // Call the leaderboard changed callback
      if (leaderboardChanged) {
        leaderboardChanged(id);
      }
    },
    [leaderboardChanged]
  );

  /**
   * Reset the page when the score mode changes
   */
  useEffect(() => {
    if (!currentScores) {
      return;
    }

    setCurrentPage(1);
  }, [selectedMode]);

  /**
   * Set the current scores.
   */
  useEffect(() => {
    if (data) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation]);

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    navigateToPage(
      `/leaderboard/${selectedLeaderboardId}/${currentPage}${selectedMode !== ScoreModeEnum.Global ? "?category=" + selectedMode : ""}`
    );
  }, [selectedLeaderboardId, currentPage, disableUrlChanging, navigateToPage, selectedMode]);

  if (currentScores === undefined) {
    return <LeaderboardScoresSkeleton />;
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col lg:flex-row justify-center lg:px-10 items-center flex-wrap gap-2",
          isLeaderboardPage ? "lg:justify-between" : ""
        )}
      >
        <ScoreMode initialMode={selectedMode} onModeChange={setSelectedMode} />

        <div className="flex gap-2 flex-wrap justify-center">
          {showDifficulties &&
            leaderboard.difficulties.map(({ difficulty, characteristic, leaderboardId }, index) => {
              if (characteristic !== "Standard") {
                return null;
              }

              const isSelected = leaderboardId === selectedLeaderboardId;
              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    handleLeaderboardChange(leaderboardId);
                  }}
                  className={`border ${isSelected ? "bg-primary/5 font-bold" : ""}`}
                  style={{
                    color: getDifficulty(difficulty).color,
                    borderColor: getDifficulty(difficulty).color,
                  }}
                >
                  {getDifficultyName(difficulty)}
                </Button>
              );
            })}
        </div>
      </div>

      {isError ||
        (currentScores.scores.length === 0 && (
          <div className="text-center">
            {isError && <p>Oopsies! Something went wrong.</p>}
            {currentScores.scores.length === 0 && <p>No scores found.</p>}
          </div>
        ))}

      {currentScores.scores.length > 0 && (
        <>
          <div className="overflow-x-auto relative">
            <table className="table w-full table-auto border-spacing-2 border-none text-left text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1">Rank</th>
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1 text-center">Time Set</th>
                  <th className="px-2 py-1 text-center">Score</th>
                  <th className="px-2 py-1 text-center">Accuracy</th>
                  <th className="px-2 py-1 text-center">Misses</th>
                  {leaderboard.stars > 0 && <th className="px-2 py-1 text-center">PP</th>}
                  <th className="px-2 py-1 text-center">Mods</th>
                  {currentScores.scores.some(score => score.additionalData !== undefined) && (
                    <th className="px-2 py-1 text-center"></th>
                  )}
                </tr>
              </thead>
              <motion.tbody
                initial="hidden"
                animate={controls}
                className="border-none"
                variants={scoreAnimation}
              >
                {currentScores.scores.map((playerScore, index) => (
                  <motion.tr
                    key={index}
                    className="border-b border-border"
                    variants={scoreAnimation}
                  >
                    <LeaderboardScore
                      key={playerScore.scoreId}
                      score={playerScore}
                      leaderboard={leaderboard}
                      highlightedPlayer={highlightedPlayer}
                    />
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          <Pagination
            mobilePagination={isMobile}
            page={currentPage}
            totalItems={currentScores.metadata.totalItems}
            itemsPerPage={currentScores.metadata.itemsPerPage}
            loadingPage={isLoading ? currentPage : undefined}
            generatePageUrl={page => {
              return `/leaderboard/${selectedLeaderboardId}/${page}`;
            }}
            onPageChange={newPage => {
              setCurrentPage(newPage);
              setPreviousPage(currentPage);
            }}
          />
        </>
      )}
    </>
  );
}
