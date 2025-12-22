"use client";

import { cn } from "@/common/utils";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/contexts/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce, useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { ClockIcon, SearchIcon, TrendingUpIcon, XIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { ButtonGroup, ControlButton, ControlPanel, ControlRow } from "../../ui/control-panel";
import { EmptyState } from "../../ui/empty-state";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";
import { ScoreSaberScoreModeTabs } from "./scoresaber-score-mode-selector";

const DEFAULT_SORT: ScoreSaberScoreSort = "recent";

const SORT_OPTIONS = [
  { name: "Top", value: "top", icon: <TrendingUpIcon className="h-4 w-4" /> },
  { name: "Recent", value: "recent", icon: <ClockIcon className="h-4 w-4" /> },
];

interface ScoreSaberPlayerScoresLiveProps {
  initialSearch?: string;
  player: ScoreSaberPlayer;
}

export default function ScoreSaberPlayerScoresLive({ player }: ScoreSaberPlayerScoresLiveProps) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const showScoreComparison = useStableLiveQuery(() => database.getShowScoreComparison());

  // Sorting
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(DEFAULT_SORT)) as [
    ScoreSaberScoreSort,
    (value: ScoreSaberScoreSort | null) => void,
  ];

  // Search
  const [search, setSearch] = useQueryState("search", parseAsString);
  const debouncedSearchTerm = useDebounce(search || "", 250);
  const invalidSearch = search && search.length >= 1 && search.length < 3;

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      `${player.name} / ScoreSaber / ${page} / ${capitalizeFirstLetter(sort)}`
    )
  );

  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
      setSearch(debouncedSearchTerm);
    } else if (debouncedSearchTerm === "") {
      setSearch(null);
    }
  }, [debouncedSearchTerm, setSearch]);

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<PlayerScoresPageResponse>({
    queryKey: [
      "playerScores:live",
      player.id,
      page,
      sort,
      debouncedSearchTerm,
      mainPlayerId,
      showScoreComparison,
    ],
    queryFn: async () => {
      const response = await ssrApi.fetchScoreSaberPlayerScores(
        player.id,
        page,
        sort,
        invalidSearch ? undefined : debouncedSearchTerm,
        showScoreComparison && mainPlayerId ? mainPlayerId : undefined
      );
      return response || Pagination.empty();
    },
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  const handleSortChange = useCallback(
    (newSort: ScoreSaberScoreSort) => {
      setIsLoading(true);
      setSort(newSort);
      setPage(1);
      animateLeft();
    },
    [setSort, setPage, animateLeft, setIsLoading]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setIsLoading(true);
      if (newPage > page) {
        animateLeft();
      } else {
        animateRight();
      }
      setPage(newPage);
    },
    [page, animateLeft, animateRight, setIsLoading, setPage]
  );

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearch(newSearch);
      if (newSearch.length >= 3 || newSearch === "") {
        setIsLoading(true);
        setPage(1);
        animateLeft();
      }
    },
    [animateLeft, setIsLoading, setPage]
  );

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      if (sort !== DEFAULT_SORT) params.set("sort", sort);
      if (pageNum !== 1) params.set("page", String(pageNum));
      if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) params.set("search", debouncedSearchTerm);
      const queryString = params.toString();
      return `/player/${player.id}/scoresaber${queryString ? `?${queryString}` : ""}`;
    },
    [player.id, sort, debouncedSearchTerm]
  );

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
                className="border-border rounded-lg border"
                title="No Results"
                description="No score were found on this page"
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
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        <ControlPanel>
          <ControlRow>
            <ScoreSaberScoreModeTabs />
          </ControlRow>
          <ControlRow className="mb-0!">
            <div className="flex w-full flex-col-reverse items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Query..."
                  className={cn("h-8 w-full pr-3 pl-8 text-xs sm:w-64", invalidSearch && "border-red-500")}
                  value={search || ""}
                  onChange={e => handleSearchChange(e.target.value)}
                />
                {search && search.length > 0 && (
                  <XIcon
                    className="text-muted-foreground absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer"
                    onClick={() => handleSearchChange("")}
                  />
                )}
              </div>

              <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-4">
                <ButtonGroup>
                  {SORT_OPTIONS.map(sortOption => (
                    <ControlButton
                      key={sortOption.value}
                      isActive={sortOption.value === sort}
                      onClick={() => handleSortChange(sortOption.value as ScoreSaberScoreSort)}
                    >
                      {sortOption.value === sort && (isLoading || isRefetching) ? (
                        <Spinner size="sm" className="h-3.5 w-3.5" />
                      ) : (
                        sortOption.icon
                      )}
                      {sortOption.name}
                    </ControlButton>
                  ))}
                </ButtonGroup>
              </div>
            </div>
          </ControlRow>
        </ControlPanel>

        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
