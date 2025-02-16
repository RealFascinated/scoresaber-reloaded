"use client";

import { cn } from "@/common/utils";
import LeaderboardScoresSkeleton from "@/components/leaderboard/skeleton/leaderboard-scores-skeleton";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreMode, { ScoreModeEnum } from "@/components/score/score-mode";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
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

  const [mode, setMode] = useState<ScoreModeEnum>(initialCategory);
  const [leaderboardId, setLeaderboardId] = useState(leaderboard.id);
  const [page, setPage] = useState(initialPage);

  const {
    data: scores,
    isError,
    isLoading,
  } = useLeaderboardScores(leaderboardId, page, mode, filter.country);

  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setLeaderboardId(id);
      setPage(1);
      leaderboardChanged?.(id);
    },
    [leaderboardChanged]
  );

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    changePageUrl(
      `/leaderboard/${leaderboardId}${page !== 1 ? `/${page}` : ""}${mode !== ScoreModeEnum.Global ? "?category=" + mode : ""}`
    );
  }, [leaderboardId, page, disableUrlChanging, changePageUrl, mode]);

  if (!scores) {
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
          initialMode={mode}
          onModeChange={mode => {
            setMode(mode);
            setPage(1);
          }}
        />

        {showDifficulties && (
          <div className="flex gap-2 flex-wrap justify-center">
            {leaderboard.difficulties.map((difficultyData, index) => (
              <DifficultyButton
                key={index}
                {...difficultyData}
                selectedId={leaderboardId}
                onSelect={handleLeaderboardChange}
              />
            ))}
          </div>
        )}
      </div>

      {isError ||
        (scores.items.length === 0 && (
          <div className="text-center">
            {isError && <p>Oopsies! Something went wrong.</p>}
            {scores.items.length === 0 && <p>No scores found</p>}
          </div>
        ))}

      {scores.items.length > 0 && (
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
                  {scores.items.some(score => score.additionalData !== undefined) && (
                    <th className="px-2 py-1 text-center"></th>
                  )}
                </tr>
              </thead>
              <tbody className="border-none">
                {scores.items.map((playerScore, index) => (
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
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading ? page : undefined}
            generatePageUrl={page => {
              return `/leaderboard/${leaderboardId}/${page}`;
            }}
            onPageChange={newPage => setPage(newPage)}
          />
        </>
      )}
    </>
  );
}
