"use client";

import { cn, isEqual } from "@/common/utils";
import LeaderboardScoresSkeleton from "@/components/leaderboard/skeleton/leaderboard-scores-skeleton";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreMode, { ScoreModeEnum } from "@/components/score/score-mode";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { useCallback, useEffect, useState } from "react";
import Pagination from "../input/pagination";
import { DifficultyButton } from "./button/difficulty-button";
import LeaderboardScore from "./page/leaderboard-score";

type LeaderboardScoresProps = {
  initialPage?: number;
  initialCategory?: ScoreModeEnum;
  leaderboard: ScoreSaberLeaderboard;
  showDifficulties?: boolean;
  isLeaderboardPage?: boolean;
  leaderboardChanged?: (id: number) => void;
  disableUrlChanging?: boolean;
  highlightedPlayerId?: string;
};

export default function LeaderboardScores({
  initialPage = 1,
  initialCategory = ScoreModeEnum.Global,
  leaderboard,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
  disableUrlChanging,
  highlightedPlayerId,
}: LeaderboardScoresProps) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();
  const filter = useLeaderboardFilter();

  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(initialCategory);
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(leaderboard.id);
  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentScores, setCurrentScores] = useState<Page<ScoreSaberScore>>();
  const [hasMounted, setHasMounted] = useState(false);

  const { data, isError, isLoading } = useLeaderboardScores(
    selectedLeaderboardId,
    currentPage,
    selectedMode,
    filter.country
  );

  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setSelectedLeaderboardId(id);
      setCurrentPage(1);
      leaderboardChanged?.(id);
    },
    [leaderboardChanged]
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    changePageUrl(
      `/leaderboard/${selectedLeaderboardId}${currentPage !== 1 ? `/${currentPage}` : ""}${selectedMode !== ScoreModeEnum.Global ? "?category=" + selectedMode : ""}`
    );
  }, [selectedLeaderboardId, currentPage, disableUrlChanging, changePageUrl, selectedMode]);

  if (!currentScores) {
    return <LeaderboardScoresSkeleton />;
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col lg:flex-row justify-center lg:px-10 items-center flex-wrap gap-2",
          isLeaderboardPage && "lg:justify-between"
        )}
      >
        <ScoreMode
          initialMode={selectedMode}
          onModeChange={mode => {
            setSelectedMode(mode);
            setCurrentPage(1);
          }}
        />

        {showDifficulties && (
          <div className="flex gap-2 flex-wrap justify-center">
            {leaderboard.difficulties.map((difficultyData, index) => (
              <DifficultyButton
                key={index}
                {...difficultyData}
                selectedId={selectedLeaderboardId}
                onSelect={handleLeaderboardChange}
              />
            ))}
          </div>
        )}
      </div>

      {isError ||
        (currentScores.items.length === 0 && (
          <div className="text-center">
            {isError && <p>Oopsies! Something went wrong.</p>}
            {currentScores.items.length === 0 && <p>No scores found</p>}
          </div>
        ))}

      {currentScores.items.length > 0 && (
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
                  {currentScores.items.some(score => score.additionalData !== undefined) && (
                    <th className="px-2 py-1 text-center"></th>
                  )}
                </tr>
              </thead>
              <tbody className="border-none">
                {currentScores.items.map((playerScore, index) => (
                  <tr key={index} className="border-b border-border">
                    <LeaderboardScore
                      key={playerScore.scoreId}
                      score={playerScore}
                      leaderboard={leaderboard}
                      highlightedPlayerId={highlightedPlayerId}
                    />
                  </tr>
                ))}
              </tbody>
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
