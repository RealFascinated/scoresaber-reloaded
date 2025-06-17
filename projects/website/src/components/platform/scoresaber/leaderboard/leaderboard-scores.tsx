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
      <div className="border-border/30 bg-background/50 relative overflow-x-auto rounded-lg border">
        <table className="table w-full table-auto border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-border/30 bg-background/80 border-b">
              <th className="text-foreground/80 px-2 py-2 font-medium">Rank</th>
              <th className="text-foreground/80 px-2 py-2 font-medium">Player</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">Time Set</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">Accuracy</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">Misses</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">PP</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">HMD</th>
              <th className="text-foreground/80 px-2 py-2 text-center font-medium">Mods</th>
            </tr>
          </thead>
          <tbody className="divide-border/30 divide-y">
            {skeletonRows.map((_, index) => (
              <tr key={index} className="hover:bg-primary/5 transition-colors">
                <td className="px-2 py-1">
                  <Skeleton className="h-6 w-8 rounded-md" />
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32 rounded-md" />
                  </div>
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-24 rounded-md" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-16 rounded-md" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-8 rounded-md" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-20 rounded-md" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-16 rounded-md" />
                </td>
                <td className="px-2 py-1 text-center">
                  <Skeleton className="mx-auto h-6 w-8 rounded-md" />
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
          "flex flex-col flex-wrap items-center justify-center gap-4 lg:flex-row",
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
          <div className="bg-background/80 border-border/50 flex flex-wrap justify-center gap-3 rounded-lg border p-1.5 shadow-sm">
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
          <div className="border-border/30 bg-background/50 relative overflow-x-auto rounded-lg border">
            <table className="table w-full table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-border/30 bg-background/80 border-b">
                  <th className="text-foreground/80 px-2 py-2 font-medium">Rank</th>
                  <th className="text-foreground/80 px-2 py-2 font-medium">Player</th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">Time Set</th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">Accuracy</th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">Misses</th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">
                    {leaderboard.stars > 0 ? "PP" : "Score"}
                  </th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">HMD</th>
                  <th className="text-foreground/80 px-2 py-2 text-center font-medium">Mods</th>
                  <th className="text-foreground/80 w-[28px] px-2 py-2 text-center font-medium">
                    Replay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/30 divide-y">
                {scores.items.map((playerScore, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "hover:bg-primary/5 transition-colors",
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
