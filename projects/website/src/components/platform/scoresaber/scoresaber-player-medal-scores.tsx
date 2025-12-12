"use client";

import { Spinner } from "@/components/spinner";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { SearchIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { EmptyState } from "../../ui/empty-state";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";

interface ScoreSaberPlayerMedalScoresProps {
  player: ScoreSaberPlayer;
}

const DEFAULT_PAGE = 1;

export default function ScoreSaberPlayerMedalScores({ player }: ScoreSaberPlayerMedalScoresProps) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(DEFAULT_PAGE));

  useDocumentTitle(ssrConfig.siteTitleTemplate.replace("%s", `${player.name} / Medals / ${page}`));

  // Data fetching
  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<PlayerScoresResponse>({
    queryKey: ["playerScores:medals", player.id, page, mainPlayerId],
    queryFn: async () => {
      const response = await ssrApi.fetchPlayerMedalScores(player.id, page);
      return response || Pagination.empty();
    },
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage > page) {
        animateLeft();
      } else {
        animateRight();
      }
      setPage(newPage);
    },
    [page, animateLeft, animateRight, setPage]
  );

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      if (pageNum !== 1) params.set("page", String(pageNum));
      const queryString = params.toString();
      return `/player/${player.id}/medals${queryString ? `?${queryString}` : ""}`;
    },
    [player.id]
  );

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {isLoading && scores === undefined ? (
          <div className="flex w-full justify-center py-8">
            <Spinner size="md" className="text-primary" />
          </div>
        ) : !scores ? null : (
          <>
            <div className="text-center">
              {isError ||
                (scores.items.length === 0 && (
                  <EmptyState
                    className="border-border rounded-lg border"
                    title="No Results"
                    description={
                      page === 1
                        ? `${capitalizeFirstLetter(player.name)} has not earned any medals :(`
                        : `No medals were found on this page`
                    }
                    icon={<SearchIcon />}
                  />
                ))}
            </div>

            <PageTransition className="divide-border grid min-w-full grid-cols-1 divide-y">
              {scores.items.map(score => (
                <ScoreSaberScoreDisplay
                  key={score.score.scoreId}
                  score={score.score}
                  leaderboard={score.leaderboard}
                  beatSaverMap={score.beatSaver}
                  settings={{
                    defaultLeaderboardScoresPage: 1,
                    medalsMode: true,
                  }}
                />
              ))}
            </PageTransition>

            <SimplePagination
              mobilePagination={isMobile}
              page={page}
              totalItems={scores.metadata.totalItems}
              itemsPerPage={scores.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? page : undefined}
              generatePageUrl={buildUrl}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </ScoresCard>
  );
}
