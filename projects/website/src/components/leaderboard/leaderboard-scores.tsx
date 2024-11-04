"use client";

import useWindowDimensions from "@/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Pagination from "../input/pagination";
import LeaderboardScore from "./leaderboard-score";
import { scoreAnimation } from "@/components/score/score-animation";
import { Button } from "@/components/ui/button";
import { getDifficulty, getDifficultyName } from "@/common/song-utils";
import { fetchLeaderboardScores } from "@ssr/common/utils/score.util";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import LeaderboardScoresSkeleton from "@/components/leaderboard/skeleton/leaderboard-scores-skeleton";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Metadata } from "@ssr/common/types/metadata";
import ScoreMode, { ScoreModeEnum, scoreModes, ScoreModeType } from "@/components/score/score-mode";
import { getFriendScores } from "@ssr/common/utils/player-utils";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

type LeaderboardScoresProps = {
  initialPage?: number;
  initialScores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
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
  initialScores,
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

  const database = useDatabase();
  const friendIds = useLiveQuery(() => database.getFriendIds());

  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(ScoreModeEnum.Global);
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(leaderboard.id);
  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentScores, setCurrentScores] = useState<ScoresPage | undefined>(
    initialScores
      ? {
          scores: initialScores.scores,
          metadata: initialScores.metadata,
        }
      : undefined
  );
  const topOfScoresRef = useRef<HTMLDivElement>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isError, isLoading } = useQuery<ScoresPage>({
    queryKey: ["leaderboardScores", selectedLeaderboardId, currentPage, selectedMode],
    queryFn: async () => {
      if (selectedMode == ScoreModeEnum.Global) {
        const leaderboard = await fetchLeaderboardScores<ScoreSaberScore, ScoreSaberLeaderboard>(
          "scoresaber",
          selectedLeaderboardId + "",
          currentPage
        );

        return {
          scores: leaderboard!.scores,
          metadata: leaderboard!.metadata,
        };
      } else {
        if (friendIds) {
          const friendScores = await getFriendScores(friendIds, selectedLeaderboardId + "", currentPage);
          if (friendScores) {
            const friends = await database.getFriends();

            return {
              scores: friendScores.items.map(score => {
                const friend = friends.find(f => f.id == score.playerId);
                if (!friend) {
                  return score;
                }

                score.rank = -1;
                score.playerInfo = {
                  id: score.playerId,
                  name: friend.name,
                  country: friend.country,
                  permissions: friend.permissions,
                  profilePicture: friend.profilePicture,
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
    enabled: shouldFetch,
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
      setShouldFetch(true);
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
    setCurrentPage(1);
    setShouldFetch(true);
  }, [selectedMode]);

  /**
   * Set the current scores.
   */
  useEffect(() => {
    if (data) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation]);

  /**
   * Handle scrolling to the top of the
   * scores when new scores are loaded.
   */
  useEffect(() => {
    if (topOfScoresRef.current && shouldFetch && isLeaderboardPage) {
      const topOfScoresPosition = topOfScoresRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: topOfScoresPosition - 75, // Navbar height (plus some padding)
        behavior: "smooth",
      });
    }
  }, [currentPage, topOfScoresRef, shouldFetch, isLeaderboardPage]);

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    // Update the URL
    window.history.replaceState(null, "", `/leaderboard/${selectedLeaderboardId}/${currentPage}`);
  }, [selectedLeaderboardId, currentPage, disableUrlChanging]);

  if (currentScores === undefined) {
    return <LeaderboardScoresSkeleton />;
  }

  return (
    <>
      {/* Where to scroll to when new scores are loaded */}
      <div ref={topOfScoresRef} className="absolute" />

      <div className="flex gap-10 justify-center items-center flex-wrap">
        <ScoreMode onModeChange={setSelectedMode} />

        <div>
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

      <div className="text-center">
        {isError && <p>Oopsies! Something went wrong.</p>}
        {currentScores.scores.length === 0 && <p>No {selectedMode?.toLowerCase()} scores found.</p>}
      </div>

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
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate={controls} className="border-none" variants={scoreAnimation}>
                {currentScores.scores.map((playerScore, index) => (
                  <motion.tr key={index} className="border-b border-border" variants={scoreAnimation}>
                    <LeaderboardScore
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
            mobilePagination={width < 768}
            page={currentPage}
            totalPages={currentScores.metadata.totalPages}
            loadingPage={isLoading ? currentPage : undefined}
            generatePageUrl={page => {
              return `/leaderboard/${selectedLeaderboardId}/${page}`;
            }}
            onPageChange={newPage => {
              setCurrentPage(newPage);
              setPreviousPage(currentPage);
              setShouldFetch(true);
            }}
          />
        </>
      )}
    </>
  );
}
