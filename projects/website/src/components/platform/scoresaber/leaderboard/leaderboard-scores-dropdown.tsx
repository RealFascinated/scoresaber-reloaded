"use client";

import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { useState } from "react";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

export default function LeaderboardScoresDropdown({
  initialPage = 1,
  leaderboard,
  highlightedPlayerId,
  historyPlayerId,
}: {
  initialPage?: number;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
  historyPlayerId?: string;
}) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useState<ScoreModeEnum>(ScoreModeEnum.Global);
  const [page, setPage] = useState(initialPage);

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(
    leaderboard.id,
    historyPlayerId ?? mainPlayerId ?? "",
    page,
    mode,
    filter.country ?? undefined
  );

  const isFriends = mode === ScoreModeEnum.Friends;
  const noScores =
    isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  return (
    <div className="flex flex-col gap-(--spacing-md)">
      <div className="flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
        <ScoreModeSwitcher initialMode={mode} onModeChange={setMode} />
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

              {scores &&
                scores.items.length > 0 &&
                scores.items.map(playerScore => (
                  <ScoreSaberLeaderboardScore
                    key={getScoreId(playerScore)}
                    score={playerScore}
                    leaderboard={leaderboard}
                    highlightedPlayerId={highlightedPlayerId}
                  />
                ))}
            </table>
          </div>

          {scores && scores.items.length > 0 && (
            <SimplePagination
              mobilePagination={isMobile}
              page={page}
              totalItems={scores.metadata.totalItems}
              itemsPerPage={scores.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? page : undefined}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
