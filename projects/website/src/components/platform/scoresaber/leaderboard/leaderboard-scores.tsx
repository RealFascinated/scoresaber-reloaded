"use client";

import { cn } from "@/common/utils";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import usePageNavigation from "@/hooks/use-page-navigation";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { buildSearchParams } from "@ssr/common/utils/search-params";
import { useCallback, useEffect, useState } from "react";
import { DifficultyButton } from "../../../leaderboard/button/difficulty-button";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

export default function LeaderboardScores({
  initialPage = 1,
  initialCategory = ScoreModeEnum.Global,
  leaderboard,
  beatSaver,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
  disableUrlChanging,
  highlightedPlayerId,
  historyPlayerId,
}: {
  initialPage?: number;
  initialCategory?: ScoreModeEnum;
  leaderboard: ScoreSaberLeaderboard;
  beatSaver?: BeatSaverMapResponse;
  showDifficulties?: boolean;
  isLeaderboardPage?: boolean;
  leaderboardChanged?: (id: number) => void;
  disableUrlChanging?: boolean;
  highlightedPlayerId?: string;
  historyPlayerId?: string;
}) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useState<ScoreModeEnum>(initialCategory);
  const [leaderboardId, setLeaderboardId] = useState(leaderboard.id);
  const [page, setPage] = useState(initialPage);

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(leaderboardId, historyPlayerId ?? mainPlayerId ?? "", page, mode, filter.country);

  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setLeaderboardId(id);
      setPage(1);
      leaderboardChanged?.(id);
    },
    [leaderboardChanged]
  );

  const handleModeChange = useCallback((newMode: ScoreModeEnum) => {
    setMode(newMode);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const generatePageUrl = useCallback(
    (page: number) => {
      return `/leaderboard/${leaderboardId}/${page}`;
    },
    [leaderboardId]
  );

  useEffect(() => {
    setPage(1);
  }, [filter.country]);

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    changePageUrl(
      `/leaderboard/${leaderboardId}${page !== 1 ? `/${page}` : ""}?${buildSearchParams({ category: mode === ScoreModeEnum.Global ? undefined : mode, country: filter.country ?? undefined })}`
    );
  }, [leaderboardId, page, disableUrlChanging, changePageUrl, mode, filter.country]);

  const isFriends = mode === ScoreModeEnum.Friends;
  const noScores = isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row",
          isLeaderboardPage && "sm:justify-between"
        )}
      >
        <ScoreModeSwitcher initialMode={mode} onModeChange={handleModeChange} />

        {showDifficulties && (
          <div className="flex flex-wrap justify-center gap-(--spacing-sm)">
            {leaderboard.difficulties.map((difficultyData, index) => (
              <DifficultyButton
                key={index}
                {...difficultyData}
                selectedId={leaderboardId}
                onSelect={handleLeaderboardChange}
                inGameDifficulty={beatSaver?.difficultyLabels?.[difficultyData.difficulty] ?? undefined}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading && !scores ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="border-border bg-background/50 relative overflow-x-auto rounded-lg border">
            <table className="table w-full min-w-[800px] table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="text-foreground/90 px-3 py-3 font-semibold">Rank</th>
                  <th className="text-foreground/90 px-3 py-3 font-semibold">Player</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Date Set</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Accuracy</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Misses</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">
                    {leaderboard.stars > 0 ? "PP" : "Score"}
                  </th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Mods</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>

              {noScores && (
                <tbody className="text-center">
                  <tr>
                    <td colSpan={10}>
                      <EmptyState
                        title="No Scores Found"
                        description={
                          isFriends
                            ? "You or your friends haven't played this map yet"
                            : "No scores were found on this leaderboard or page"
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              )}

              {scores && scores.items.length > 0 && (
                <tbody className="divide-border/50 divide-y">
                  {scores.items.map(playerScore => (
                    <ScoreSaberLeaderboardScore
                      key={getScoreId(playerScore)}
                      score={playerScore}
                      leaderboard={leaderboard}
                      highlightedPlayerId={highlightedPlayerId}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>

          {scores && scores.items.length > 0 && (
            <SimplePagination
              mobilePagination={isMobile}
              page={page}
              totalItems={scores.metadata.totalItems}
              itemsPerPage={scores.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? page : undefined}
              generatePageUrl={generatePageUrl}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
