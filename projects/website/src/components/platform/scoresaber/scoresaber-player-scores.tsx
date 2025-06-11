"use client";

import { PlatformRepository } from "@/common/platform/platform-repository";
import { LoadingIcon } from "@/components/loading-icon";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { ClockIcon, TrophyIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScore } from "@ssr/common/score/player-score";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { clsx } from "clsx";
import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { Button } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import ScoreSaberScoreDisplay from "./score/score";

type Props = {
  initialSearch?: string;
  player: ScoreSaberPlayer;
  sort: ScoreSaberScoreSort;
  page: number;
};

const scoreSort = [
  { name: "Top", value: "top", icon: <TrophyIcon className="w-5 h-5" /> },
  { name: "Recent", value: "recent", icon: <ClockIcon className="w-5 h-5" /> },
];

export default function ScoreSaberPlayerScores({ initialSearch, player, sort, page }: Props) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();
  const platform = PlatformRepository.getInstance().getScoreSaberPlatform();

  const [currentPage, setCurrentPage] = useState(page);
  const [currentSort, setCurrentSort] = useState(sort);
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");

  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const isSearchActive = useMemo(() => debouncedSearchTerm.length >= 3, [debouncedSearchTerm]);
  const invalidSearch = useMemo(
    () => searchTerm.length >= 1 && searchTerm.length < 3,
    [searchTerm]
  );

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>>({
    queryKey: ["playerScores", player.id, currentPage, currentSort, debouncedSearchTerm],
    queryFn: () =>
      platform.getPlayerScores(player.id, currentPage, {
        sort: currentSort,
        search: debouncedSearchTerm,
      }),
    placeholderData: prev => prev,
  });

  /**
   * Change the score sort.
   *
   * @param newSort the new sort
   */
  const handleSortChange = useCallback(
    async (newSort: ScoreSaberScoreSort) => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
      }
    },
    [currentSort]
  );

  /**
   * Gets the URL to the page.
   */
  const getUrl = useCallback(
    (page: number) => {
      return `/player/${player.id}/scoresaber/${currentSort}/${page}${isSearchActive ? `?search=${searchTerm}` : ""}`;
    },
    [searchTerm, player.id, currentSort, isSearchActive]
  );

  /**
   * Handle updating the URL when the page number,
   * sort, or search term changes.
   */
  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [currentPage, debouncedSearchTerm, player.id, isSearchActive, currentSort]);

  return (
    <ScoresCard>
      <div className="flex flex-col items-center w-full gap-2 relative">
        <div className="flex gap-2">
          {scoreSort.map(sortOption => (
            <Button
              key={sortOption.value}
              variant={sortOption.value === currentSort ? "default" : "outline"}
              onClick={() => handleSortChange(sortOption.value as ScoreSaberScoreSort)}
              size="sm"
              className="flex items-center gap-1"
            >
              {sortOption.icon}
              {`${capitalizeFirstLetter(sortOption.name)} Scores`}
            </Button>
          ))}
        </div>

        <div className="relative w-72 lg:absolute right-0 top-0">
          <Input
            type="search"
            placeholder="Search..."
            className={clsx(invalidSearch && "border-red-500")}
            value={searchTerm}
            onChange={e => {
              setCurrentPage(1);
              setSearchTerm(e.target.value);
            }}
          />
        </div>
      </div>

      {isLoading && scores === undefined && (
        <div className="flex w-full justify-center py-8">
          <LoadingIcon size="md" className="text-primary" />
        </div>
      )}

      {scores !== undefined && (
        <>
          <div className="text-center pt-2">
            {isError ||
              (scores.items.length === 0 && (
                <EmptyState
                  title="No Results"
                  description="No score were found on this page"
                  icon={<SearchIcon />}
                />
              ))}
          </div>

          <div className="grid min-w-full grid-cols-1 divide-y divide-border">
            {scores.items.map((score, index) => (
              <div key={index}>
                <ScoreSaberScoreDisplay
                  key={score.score.scoreId}
                  score={score.score}
                  leaderboard={score.leaderboard}
                  beatSaverMap={score.beatSaver}
                  highlightedPlayerId={player.id}
                  settings={{
                    allowLeaderboardPreview: true,
                  }}
                />
              </div>
            ))}
          </div>

          {scores.metadata.totalPages > 1 && (
            <SimplePagination
              mobilePagination={isMobile}
              page={currentPage}
              totalItems={scores.metadata.totalItems}
              itemsPerPage={scores.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? currentPage : undefined}
              generatePageUrl={page => getUrl(page)}
              onPageChange={newPage => setCurrentPage(newPage)}
            />
          )}
        </>
      )}
    </ScoresCard>
  );
}
