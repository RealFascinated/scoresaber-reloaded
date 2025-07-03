"use client";

import { Spinner } from "@/components/spinner";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import usePageNavigation from "@/hooks/use-page-navigation";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { useLiveQuery } from "dexie-react-hooks";
import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { EmptyState } from "../../ui/empty-state";
import ScoreSaberScoreDisplay from "./score/score";

interface ScoreSaberPlayerMedalScoresProps {
  player: ScoreSaberPlayer;
  page: number;
}

export default function ScoreSaberPlayerMedalScores({
  player,
  page,
}: ScoreSaberPlayerMedalScoresProps) {
  // Hooks
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { changePageUrl } = usePageNavigation();
  const { animateLeft, animateRight } = usePageTransition();

  // Database queries
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());

  // State
  const [currentPage, setCurrentPage] = useState(page);

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace("%s", `${player.name} / Medals / ${currentPage}`)
  );

  // Data fetching
  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<PlayerScoresResponse>({
    queryKey: ["playerMedalScores", player.id, currentPage, mainPlayerId],
    queryFn: async () => {
      const response = await ssrApi.fetchCachedScoreSaberPlayerMedalScores(player.id, currentPage);
      return response || Pagination.empty();
    },
    placeholderData: prev => prev,
  });

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage > currentPage) {
        animateLeft();
      } else {
        animateRight();
      }
      setCurrentPage(newPage);
    },
    [currentPage, animateLeft, animateRight]
  );

  // URL management
  const getUrl = useCallback(
    (page: number) => {
      return `/player/${player.id}/medals/${page}`;
    },
    [player.id]
  );

  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [currentPage, player.id, changePageUrl, getUrl]);

  // Render helpers
  const renderScoresList = () => {
    if (isLoading && scores === undefined) {
      return (
        <div className="flex w-full justify-center py-8">
          <Spinner size="md" className="text-primary" />
        </div>
      );
    }

    if (!scores) return null;

    return (
      <>
        <div className="text-center">
          {isError ||
            (scores.items.length === 0 && (
              <EmptyState
                title="No Results"
                description={
                  currentPage === 1
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
          page={currentPage}
          totalItems={scores.metadata.totalItems}
          itemsPerPage={scores.metadata.itemsPerPage}
          loadingPage={isLoading || isRefetching ? currentPage : undefined}
          generatePageUrl={getUrl}
          onPageChange={handlePageChange}
        />
      </>
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">{renderScoresList()}</div>
    </ScoresCard>
  );
}
