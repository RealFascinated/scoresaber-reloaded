"use client";

import Card from "@/components/card";
import PlayerScoreHeader from "@/components/score/player-score-header";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import ScoreSaberScoreDisplay from "../scoresaber-score";

export function TopScoresData() {
  const isMobile = useIsMobile();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const {
    data: scores,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["top-scores", page],
    queryFn: () => ssrApi.fetchTopScores(page),
    refetchInterval: false,
    placeholderData: data => data,
  });

  return (
    <Card className="flex h-fit w-full flex-col 2xl:w-[75%]">
      {/* Header Section */}
      <div className="mb-(--spacing-lg)">
        <h1 className="text-2xl font-semibold">Top ScoreSaber Scores</h1>
        <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
          Discover the highest scores tracked across ScoreSaber
        </p>
      </div>

      {isLoading || !scores ? (
        <div className="flex items-center justify-center py-(--spacing-2xl)">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-(--spacing-sm)">
          {/* Scores */}
          {scores.items.map(({ score, leaderboard, beatSaver }) => {
            const player = score.playerInfo;

            return (
              <div key={score.scoreId} className="flex flex-col">
                <PlayerScoreHeader player={player} />

                <Card className="rounded-lg rounded-tl-none p-0">
                  <ScoreSaberScoreDisplay
                    key={score.scoreId}
                    score={score}
                    leaderboard={leaderboard}
                    beatSaverMap={beatSaver}
                    settings={{
                      hideAccuracyChanger: true,
                    }}
                  />
                </Card>
              </div>
            );
          })}

          {/* Pagination */}
          <SimplePagination
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={setPage}
            mobilePagination={isMobile}
          />
        </div>
      )}
    </Card>
  );
}
