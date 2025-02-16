import { setCookieValue } from "@/common/cookie.util";
import { LoadingIcon } from "@/components/loading-icon";
import Score from "@/components/score/score";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { ClockIcon, TrophyIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";

type Props = {
  initialScoreData?: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
  initialSearch?: string;
  player: ScoreSaberPlayer;
  sort: ScoreSort;
  page: number;
};

const scoreSort = [
  { name: "Top", value: ScoreSort.top, icon: <TrophyIcon className="w-5 h-5" /> },
  { name: "Recent", value: ScoreSort.recent, icon: <ClockIcon className="w-5 h-5" /> },
];

export default function PlayerScores({ initialSearch, player, sort, page }: Props) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();

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
  } = useQuery({
    queryKey: ["playerScores", player.id, currentPage, currentSort, debouncedSearchTerm],
    queryFn: () =>
      ssrApi.fetchPlayerScores<ScoreSaberScore, ScoreSaberLeaderboard>(
        player.id,
        currentPage,
        currentSort,
        debouncedSearchTerm
      ),
    placeholderData: prev => prev,
  });

  /**
   * Change the score sort.
   *
   * @param newSort the new sort
   */
  const handleSortChange = useCallback(
    async (newSort: ScoreSort) => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        await setCookieValue("lastScoreSort", newSort); // Set the default score sort
      }
    },
    [currentSort]
  );

  /**
   * Gets the URL to the page.
   */
  const getUrl = useCallback(
    (page: number) => {
      const baseUrl = `/player/${player.id}`;
      return page === 1 && currentSort === ScoreSort.recent
        ? `${baseUrl}${isSearchActive ? `?search=${searchTerm}` : ""}`
        : `${baseUrl}/${currentSort}/${page}${isSearchActive ? `?search=${searchTerm}` : ""}`;
    },
    [searchTerm, player.id, currentSort, isSearchActive]
  );

  /**
   * Handle updating the URL when the page number,
   * sort, or search term changes.
   */
  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [currentPage, debouncedSearchTerm, player.id, isSearchActive]);

  return (
    <Card className="flex gap-1">
      <div className="flex flex-col items-center w-full gap-2 relative">
        <div className="flex gap-2">
          {scoreSort.map(sortOption => (
            <Button
              key={sortOption.value}
              variant={sortOption.value === currentSort ? "default" : "outline"}
              onClick={() => handleSortChange(sortOption.value)}
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
        <div className="flex w-full justify-center">
          <LoadingIcon />
        </div>
      )}

      {scores !== undefined && (
        <>
          <div className="text-center">
            {isError ||
              (scores.scores.length === 0 && <p>No scores found. Invalid Page or Search?</p>)}
          </div>

          <div className="grid min-w-full grid-cols-1 divide-y divide-border">
            {scores.scores.map((score, index) => (
              <div key={index}>
                <Score
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
            <Pagination
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
    </Card>
  );
}
