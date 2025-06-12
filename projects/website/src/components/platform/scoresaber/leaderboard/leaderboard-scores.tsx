"use client";

import { cn } from "@/common/utils";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreMode, { ScoreModeEnum } from "@/components/score/score-mode";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { useCallback, useEffect, useState } from "react";
import { DifficultyButton } from "../../../leaderboard/button/difficulty-button";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

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

function LeaderboardScoresSkeleton() {
  const skeletonRows = new Array(10).fill(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto relative rounded-lg border border-border/30 bg-background/50">
        <table className="table w-full table-auto border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-border/30 bg-background/80">
              <th className="px-2 py-2 font-medium text-foreground/80">Rank</th>
              <th className="px-2 py-2 font-medium text-foreground/80">Player</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">Time Set</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">Accuracy</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">Misses</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">PP</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">HMD</th>
              <th className="px-2 py-2 font-medium text-center text-foreground/80">Mods</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {skeletonRows.map((_, index) => (
              <tr key={index} className="transition-colors hover:bg-primary/5">
                <td className="px-2 py-1">
                  <Skeleton className="w-8 h-6 rounded-md" />
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-32 h-6 rounded-md" />
                  </div>
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-24 h-6 rounded-md mx-auto" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-16 h-6 rounded-md mx-auto" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-8 h-6 rounded-md mx-auto" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-20 h-6 rounded-md mx-auto" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-16 h-6 rounded-md mx-auto" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="w-8 h-6 rounded-md mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    isRefetching,
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

  if (!scores || isLoading) {
    return <LeaderboardScoresSkeleton />;
  }

  const isFriends = mode === ScoreModeEnum.Friends;

  return (
    <>
      <div
        className={cn(
          "flex flex-col lg:flex-row justify-center items-center flex-wrap gap-4",
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
          <div className="flex gap-3 flex-wrap justify-center bg-background/80 p-1.5 rounded-lg border border-border/50 shadow-sm">
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
          <EmptyState
            title="No Scores Found"
            description={
              isFriends
                ? "You or your friends haven't played this map yet"
                : "No scores were found on this leaderboard or page"
            }
          />
        ))}

      {scores.items.length > 0 && (
        <>
          <div className="overflow-x-auto relative rounded-lg border border-border/30 bg-background/50">
            <table className="table w-full table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-background/80">
                  <th className="px-2 py-2 font-medium text-foreground/80">Rank</th>
                  <th className="px-2 py-2 font-medium text-foreground/80">Player</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">Time Set</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">Accuracy</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">Misses</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">PP</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">HMD</th>
                  <th className="px-2 py-2 font-medium text-center text-foreground/80">Mods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {scores.items.map((playerScore, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "transition-colors hover:bg-primary/5",
                      highlightedPlayerId === playerScore.playerId && "bg-primary/10"
                    )}
                  >
                    <ScoreSaberLeaderboardScore
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

          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
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
