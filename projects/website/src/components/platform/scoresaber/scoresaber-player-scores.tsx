"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ScoreSaberScoreDataMode } from "@ssr/common/types/score-data-mode";
import { ScoreSort } from "@ssr/common/types/sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce, useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckIcon,
  ClockIcon,
  Filter,
  Hash,
  MusicIcon,
  SearchIcon,
  StarIcon,
  Target,
  TrendingUpIcon,
  Trophy,
  XIcon,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import {
  ButtonGroup,
  ControlButton,
  ControlPanel,
  ControlRow,
  Tab,
  TabGroup,
} from "../../ui/control-panel";
import { EmptyState } from "../../ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import ScoreSaberScoreDisplay from "./score/score";

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIVE_SORT: ScoreSaberScoreSort = "recent";
const DEFAULT_CACHED_SORT: ScoreSort["field"] = "date";
const DEFAULT_CACHED_SORT_DIRECTION: ScoreSort["direction"] = "desc";
const DEFAULT_SCORES_MODE: ScoreSaberScoreDataMode = "live";
const DEFAULT_FILTER = "All Scores";
const DEFAULT_SEARCH = "";

const LIVE_SCORE_SORT = [
  { name: "Top", value: "top", icon: <TrendingUpIcon className="h-4 w-4" /> },
  { name: "Recent", value: "recent", icon: <ClockIcon className="h-4 w-4" /> },
];

const CACHED_SCORE_SORT: {
  name: string;
  value: ScoreSort["field"];
  icon: React.ReactNode;
  defaultOrder: ScoreSort["direction"];
  defaultFilter?: ScoreSort["filters"];
}[] = [
  {
    name: "PP",
    value: "pp",
    icon: <Trophy className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Date",
    value: "date",
    icon: <ClockIcon className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Misses",
    value: "misses",
    icon: <XIcon className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Accuracy",
    value: "acc",
    icon: <Target className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Score",
    value: "score",
    icon: <BarChart3 className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Max Combo",
    value: "maxcombo",
    icon: <Hash className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  {
    name: "Star Count",
    value: "starcount",
    icon: <StarIcon className="h-4 w-4" />,
    defaultOrder: "desc" as const,
    defaultFilter: { passedOnly: true },
  },
];
const CACHED_SCORE_FILTERS: {
  name: string;
  value: ScoreSort["filters"];
  icon: React.ReactNode;
}[] = [
  { name: "All Scores", value: {}, icon: <Filter className="h-4 w-4" /> },
  { name: "Ranked Only", value: { rankedOnly: true }, icon: <Trophy className="h-4 w-4" /> },
  { name: "Unranked Only", value: { unrankedOnly: true }, icon: <MusicIcon className="h-4 w-4" /> },
  { name: "Passed Only", value: { passedOnly: true }, icon: <CheckIcon className="h-4 w-4" /> },
];

const SCORES_MODES: Record<ScoreSaberScoreDataMode, { icon: React.ReactNode; tooltip: string }> = {
  cached: {
    icon: <ClockIcon className="h-4 w-4" />,
    tooltip: "Cached scores are the scores that are stored in SSR. This is NOT live data.",
  },
  live: {
    icon: <TrendingUpIcon className="h-4 w-4" />,
    tooltip: "This data is fetched from the ScoreSaber API. This is live data.",
  },
};

interface ScoreSaberPlayerScoresProps {
  player: ScoreSaberPlayer;
}

export default function ScoreSaberPlayerScores({ player }: ScoreSaberPlayerScoresProps) {
  // Hooks
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { animateLeft, animateRight } = usePageTransition();

  // Database queries
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());
  const showScoreComparison = useLiveQuery(() => database.getShowScoreComparison());

  // State
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(DEFAULT_PAGE)
  );
  const [scoresMode, setScoresMode] = useQueryState(
    "mode",
    parseAsString.withDefault(DEFAULT_SCORES_MODE)
  );
  const [currentSort, setCurrentSort] = useQueryState(
    "sort",
    parseAsString.withDefault(DEFAULT_LIVE_SORT)
  );
  const [currentSortDirection, setCurrentSortDirection] = useQueryState(
    "direction",
    parseAsString.withDefault(DEFAULT_CACHED_SORT_DIRECTION)
  );
  const [currentFilter, setCurrentFilter] = useQueryState(
    "filter",
    parseAsString.withDefault(DEFAULT_FILTER)
  );

  // Search
  const [searchTerm, setSearchTerm] = useQueryState(
    "search",
    parseAsString.withDefault(DEFAULT_SEARCH)
  );
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const invalidSearch = searchTerm.length >= 1 && searchTerm.length < 3;

  const getUrl = useCallback(
    (
      page: number,
      sort?: string,
      direction?: string,
      mode?: string,
      filter?: string,
      search?: string
    ) => {
      const params = new URLSearchParams();

      if (page !== DEFAULT_PAGE) params.set("page", page.toString());
      if ((mode || scoresMode) !== DEFAULT_SCORES_MODE) params.set("mode", mode || scoresMode);
      if ((sort || currentSort) !== DEFAULT_LIVE_SORT) params.set("sort", sort || currentSort);
      if ((direction || currentSortDirection) !== DEFAULT_CACHED_SORT_DIRECTION)
        params.set("direction", direction || currentSortDirection);
      if ((filter || currentFilter) !== DEFAULT_FILTER)
        params.set("filter", filter || currentFilter);
      if (search || searchTerm) params.set("search", search || searchTerm);

      const queryString = params.toString();
      return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    },
    [scoresMode, currentSort, currentSortDirection, currentFilter, searchTerm]
  );

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      scoresMode === "live"
        ? `${player.name} / ScoreSaber / ${currentPage} / ${capitalizeFirstLetter(currentSort)}`
        : `${player.name} / ScoreSaber / ${currentPage} / ${CACHED_SCORE_SORT.find(sort => sort.value === currentSort)?.name} / ${capitalizeFirstLetter(currentSortDirection)}`
    )
  );

  // Data fetching
  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<PlayerScoresResponse>({
    queryKey: [
      "playerScores",
      player.id,
      currentPage,
      currentSort,
      debouncedSearchTerm,
      mainPlayerId,
      showScoreComparison,
      currentSortDirection,
      scoresMode,
      currentFilter,
    ],
    queryFn: async () => {
      if (scoresMode === "live") {
        const response = await ssrApi.fetchScoreSaberPlayerScores(
          player.id,
          currentPage,
          currentSort as ScoreSaberScoreSort,
          invalidSearch ? undefined : debouncedSearchTerm,
          showScoreComparison && mainPlayerId ? mainPlayerId : undefined
        );
        return response || Pagination.empty();
      } else {
        // Find the selected filter
        const selectedFilter = CACHED_SCORE_FILTERS.find(filter => filter.name === currentFilter);

        const response = await ssrApi.fetchCachedScoreSaberPlayerScores(
          player.id,
          currentPage,
          {
            field: currentSort,
            direction: currentSortDirection,
            filters: selectedFilter ? selectedFilter.value : {},
          } as ScoreSort,
          invalidSearch ? undefined : debouncedSearchTerm
        );
        return response || Pagination.empty();
      }
    },
    placeholderData: prev => prev,
  });

  // Event handlers
  const handleSortChange = useCallback(
    async (newSort: string, defaultOrder: ScoreSort["direction"] = "desc") => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentSortDirection(defaultOrder);
        setCurrentPage(1);
        const defaultFilter = CACHED_SCORE_SORT.find(s => s.value === newSort)?.defaultFilter;
        const filterName =
          CACHED_SCORE_FILTERS.find(
            f => JSON.stringify(f.value) === JSON.stringify(defaultFilter ?? {})
          )?.name ?? DEFAULT_FILTER;
        setCurrentFilter(filterName);
      } else {
        setCurrentSortDirection(currentSortDirection === "desc" ? "asc" : "desc");
      }
    },
    [
      currentSort,
      currentSortDirection,
      setCurrentSort,
      setCurrentSortDirection,
      setCurrentPage,
      setCurrentFilter,
    ]
  );

  const handleScoreModeChange = useCallback(
    (newMode: ScoreSaberScoreDataMode) => {
      if (newMode === "live") {
        setCurrentSort(DEFAULT_LIVE_SORT);
      } else {
        setCurrentSort(DEFAULT_CACHED_SORT);
        setCurrentSortDirection(DEFAULT_CACHED_SORT_DIRECTION);
      }
      setScoresMode(newMode);
      setCurrentPage(1);
    },
    [setCurrentSort, setCurrentSortDirection, setScoresMode, setCurrentPage]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

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
              highlightedPlayerId={scoresMode === "cached" ? undefined : player.id}
              settings={{
                allowLeaderboardPreview: true,
                hideRank: scoresMode === "cached",
                defaultLeaderboardScoresPage: scoresMode === "cached" ? 1 : undefined,
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
          onBeforeNavigate={(newPage, currentPage) => {
            if (newPage > currentPage) {
              animateLeft();
            } else {
              animateRight();
            }
          }}
        />
      </>
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {/* Mode Selection - Top Row */}
          <ControlRow>
            <TabGroup>
              {Object.keys(SCORES_MODES).map(mode => {
                const newSort = mode === "live" ? DEFAULT_LIVE_SORT : DEFAULT_CACHED_SORT;
                const newDirection = mode === "live" ? "desc" : DEFAULT_CACHED_SORT_DIRECTION;
                const url = getUrl(1, newSort, newDirection, mode, currentFilter, searchTerm);

                return (
                  <Tab
                    key={mode}
                    isActive={mode === scoresMode}
                    href={url}
                    tooltip={SCORES_MODES[mode as ScoreSaberScoreDataMode].tooltip}
                  >
                    {SCORES_MODES[mode as ScoreSaberScoreDataMode].icon}
                    {capitalizeFirstLetter(mode)}
                  </Tab>
                );
              })}
            </TabGroup>
          </ControlRow>

          {/* Sort Options - Middle Row */}
          <ControlRow>
            <ButtonGroup>
              {scoresMode === "live"
                ? LIVE_SCORE_SORT.map(sortOption => {
                    const url = getUrl(
                      1,
                      sortOption.value,
                      "desc",
                      scoresMode,
                      currentFilter,
                      searchTerm
                    );

                    return (
                      <ControlButton
                        key={sortOption.value}
                        isActive={sortOption.value === currentSort}
                        href={url}
                      >
                        {sortOption.value === currentSort && (isLoading || isRefetching) ? (
                          <Spinner size="sm" className="h-3.5 w-3.5" />
                        ) : (
                          sortOption.icon
                        )}
                        {sortOption.name}
                      </ControlButton>
                    );
                  })
                : CACHED_SCORE_SORT.map(sortOption => {
                    const url = getUrl(
                      1,
                      sortOption.value,
                      sortOption.defaultOrder,
                      scoresMode,
                      currentFilter,
                      searchTerm
                    );

                    return (
                      <ControlButton
                        key={sortOption.value}
                        isActive={sortOption.value === currentSort}
                        href={url}
                      >
                        {sortOption.value === currentSort ? (
                          isLoading || isRefetching ? (
                            <Spinner size="sm" className="h-3.5 w-3.5" />
                          ) : currentSortDirection === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUp className="h-3.5 w-3.5" />
                          )
                        ) : (
                          sortOption.icon
                        )}
                        {sortOption.name}
                      </ControlButton>
                    );
                  })}
            </ButtonGroup>
          </ControlRow>

          {/* Search and Filters - Bottom Row */}
          <ControlRow className="!mb-0">
            <div className="flex w-full flex-col-reverse items-center gap-2 sm:w-auto sm:flex-row">
              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Query..."
                  className={cn(
                    "h-8 w-full pr-3 pl-8 text-xs sm:w-64",
                    invalidSearch && "border-red-500"
                  )}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <XIcon
                  className="text-muted-foreground absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </div>

              {/* Filters (cached mode only) */}
              {scoresMode === "cached" && (
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Select
                    value={currentFilter || ""}
                    onValueChange={value => {
                      setCurrentFilter(value);
                      setCurrentPage(1);
                      animateLeft();
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {CACHED_SCORE_FILTERS.map(filter => (
                        <SelectItem key={filter.name} value={filter.name}>
                          <div className="flex items-center gap-2">
                            {filter.icon}
                            <span>{filter.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentFilter && currentFilter !== "All Scores" && (
                    <SimpleTooltip display="Clear filter">
                      <button
                        onClick={() => {
                          setCurrentFilter("All Scores");
                          setCurrentPage(1);
                          animateLeft();
                        }}
                        className="border-border bg-background flex h-8 w-8 items-center justify-center rounded-md border text-red-500 transition-colors hover:border-red-500"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </SimpleTooltip>
                  )}
                </div>
              )}
            </div>
          </ControlRow>
        </ControlPanel>

        {/* Scores List */}
        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
