"use client";

import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { useMemo, useState } from "react";
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
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useState<ScoreModeEnum>(ScoreModeEnum.Global);
  const [pagesByMode, setPagesByMode] = useState<Record<ScoreModeEnum, number>>({
    [ScoreModeEnum.Global]: initialPage,
    [ScoreModeEnum.Friends]: 1,
    [ScoreModeEnum.History]: 1,
  });
  const page = useMemo(() => pagesByMode[mode] ?? 1, [mode, pagesByMode]);

  const setPage = (nextPage: number) => {
    setPagesByMode(previous => ({
      ...previous,
      [mode]: nextPage,
    }));
  };

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
          <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Date Set</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-center">Misses</TableHead>
                  <TableHead className="text-center">{leaderboard.stars > 0 ? "PP" : "Score"}</TableHead>
                  <TableHead className="text-center">Mods</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noScores ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center">
                      <EmptyState
                        title="No Scores Found"
                        description={
                          isFriends
                            ? "You or your friends haven't played this map yet"
                            : "No scores were found on this leaderboard or page"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  scores?.items.map(playerScore => (
                    <ScoreSaberLeaderboardScore
                      key={getScoreId(playerScore)}
                      score={playerScore}
                      leaderboard={leaderboard}
                      highlightedPlayerId={highlightedPlayerId}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {scores && scores.items.length > 0 && (
            <SimplePagination
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
