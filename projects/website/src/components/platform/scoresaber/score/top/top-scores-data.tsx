"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import ScoreSaberScoreDisplay from "../scoresaber-score";

export function TopScoresData() {
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
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top ScoreSaber Scores</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Discover the highest scores tracked across ScoreSaber
        </p>
      </div>

      {isLoading || !scores ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {scores.items.map(({ score, leaderboard, beatSaver }) => {
            const player = score.playerInfo;
            if (!player) return null;

            return (
              <div key={score.scoreId} className="rounded-xl ring-1 ring-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                  <Avatar
                    src={player.avatar}
                    alt={`${player.name}'s Profile Picture`}
                    size={20}
                    className="shrink-0"
                  />
                  <SimpleLink
                    href={`/player/${player.id}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {player.name}
                  </SimpleLink>
                  {score.rank > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      #{score.rank.toLocaleString()}
                    </span>
                  )}
                </div>
                <ScoreSaberScoreDisplay
                  score={score}
                  leaderboard={leaderboard}
                  beatSaverMap={beatSaver}
                  settings={{
                    hideAccuracyChanger: true,
                    noScoreButtons: true,
                    hideDetailsDropdown: true,
                  }}
                />
              </div>
            );
          })}

          <SimplePagination
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
