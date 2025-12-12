"use client";

import { cn } from "@/common/utils";
import HMDIcon from "@/components/hmd-icon";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { useUrlBuilder } from "@/hooks/use-url-builder";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
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
import { useCallback, useEffect, useState } from "react";
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
import ScoreSaberScoreDisplay from "./score/scoresaber-score";

// Constants
const DEFAULT_LIVE_SORT: ScoreSaberScoreSort = "recent";
const DEFAULT_CACHED_SORT: ScoreSort["field"] = "date";
const DEFAULT_CACHED_SORT_DIRECTION: ScoreSort["direction"] = "desc";

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
  initialSearch?: string;
  mode: ScoreSaberScoreDataMode;
  player: ScoreSaberPlayer;
  sort: ScoreSaberScoreSort | ScoreSort["field"];
  direction?: ScoreSort["direction"];
  page: number;
}

export default function ScoreSaberPlayerScores({
  initialSearch,
  player,
  mode,
  sort,
  direction,
  page,
}: ScoreSaberPlayerScoresProps) {
  // Hooks
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  // Database queries
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const showScoreComparison = useStableLiveQuery(() => database.getShowScoreComparison());

  // State
  const [currentPage, setCurrentPage] = useState(page);
  const [scoresMode, setScoresMode] = useState<ScoreSaberScoreDataMode>(mode);
  const [currentSort, setCurrentSort] = useState<string>(sort);
  const [currentSortDirection, setCurrentSortDirection] = useState<ScoreSort["direction"]>(
    direction ?? DEFAULT_CACHED_SORT_DIRECTION
  );
  const [currentFilter, setCurrentFilter] = useState<string | null>("All Scores");
  const [hmdFilter, setHmdFilter] = useState<HMD | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const invalidSearch = searchTerm.length >= 1 && searchTerm.length < 3;

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
      hmdFilter,
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
            filters: selectedFilter
              ? {
                  ...selectedFilter.value,
                  ...(hmdFilter ? { hmd: hmdFilter } : {}),
                }
              : {},
          } as ScoreSort,
          invalidSearch ? undefined : debouncedSearchTerm
        );
        return response || Pagination.empty();
      }
    },
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  // Event handlers
  const handleSortChange = useCallback(
    async (newSort: string, defaultOrder: ScoreSort["direction"] = "desc") => {
      setIsLoading(true);
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentSortDirection(defaultOrder);
        setCurrentPage(1);
        const defaultFilter = CACHED_SCORE_SORT.find(s => s.value === newSort)?.defaultFilter;
        const filterName =
          CACHED_SCORE_FILTERS.find(
            f => JSON.stringify(f.value) === JSON.stringify(defaultFilter ?? {})
          )?.name ?? "All Scores";
        setCurrentFilter(filterName);
        animateLeft();
      } else {
        setCurrentSortDirection(currentSortDirection === "desc" ? "asc" : "desc");
        animateLeft();
      }
    },
    [currentSort, currentSortDirection, animateLeft, currentFilter, setIsLoading]
  );

  const handleScoreModeChange = useCallback(
    (newMode: ScoreSaberScoreDataMode) => {
      setIsLoading(true);
      if (newMode === "live") {
        setCurrentSort(DEFAULT_LIVE_SORT);
      } else {
        setCurrentSort(DEFAULT_CACHED_SORT);
        setCurrentSortDirection(DEFAULT_CACHED_SORT_DIRECTION);
      }
      setScoresMode(newMode);
      setCurrentPage(1);
      animateLeft();
    },
    [animateLeft, setIsLoading]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setIsLoading(true);
      if (newPage > currentPage) {
        animateLeft();
      } else {
        animateRight();
      }
      setCurrentPage(newPage);
    },
    [currentPage, animateLeft, animateRight, setIsLoading]
  );

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearchTerm(newSearch);
      if (newSearch.length >= 3 || newSearch === "") {
        setIsLoading(true);
        setCurrentPage(1);
        animateLeft();
      }
    },
    [animateLeft, setIsLoading]
  );

  // URL management
  const isDefaultLiveState =
    scoresMode === "live" && currentSort === DEFAULT_LIVE_SORT && currentPage === 1;
  const isDefaultCachedState =
    scoresMode === "cached" &&
    currentSort === DEFAULT_CACHED_SORT &&
    currentSortDirection === DEFAULT_CACHED_SORT_DIRECTION &&
    currentPage === 1;
  const isDefaultState = isDefaultLiveState || isDefaultCachedState;

  const { buildUrl } = useUrlBuilder({
    basePath: `/player/${player.id}`,
    segments: [
      { value: "scoresaber", condition: !isDefaultState },
      { value: scoresMode, condition: !isDefaultState },
      { value: currentSort, condition: !isDefaultState },
      { value: currentSortDirection, condition: scoresMode === "cached" && !isDefaultState },
      { value: currentPage, condition: !isDefaultState },
    ],
    queryParams: [
      { key: "search", value: searchTerm, condition: Boolean(searchTerm && searchTerm !== "") },
      {
        key: "filter",
        value: currentFilter,
        condition: Boolean(currentFilter && currentFilter !== "All Scores"),
      },
    ],
  });

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
              settings={{
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
          generatePageUrl={buildUrl}
          onPageChange={handlePageChange}
        />
      </>
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {scoresMode === "live" ? (
            // Responsive Layout for Live Mode
            <ControlRow className="mb-0!">
              <div className="flex w-full flex-col-reverse items-center gap-2">
                {/* Bottom Row on Mobile, Right Side on Desktop: Search */}
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
                    onChange={e => handleSearchChange(e.target.value)}
                  />
                  {searchTerm.length > 0 && (
                    <XIcon
                      className="text-muted-foreground absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer"
                      onClick={() => handleSearchChange("")}
                    />
                  )}
                </div>

                {/* Top Row on Mobile, Left Side on Desktop: Mode Selection and Sort Options */}
                <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-4">
                  {/* Mode Selection */}
                  <TabGroup>
                    {Object.keys(SCORES_MODES).map(mode => (
                      <Tab
                        key={mode}
                        isActive={mode === scoresMode}
                        onClick={() => handleScoreModeChange(mode as ScoreSaberScoreDataMode)}
                        tooltip={SCORES_MODES[mode as ScoreSaberScoreDataMode].tooltip}
                      >
                        {SCORES_MODES[mode as ScoreSaberScoreDataMode].icon}
                        {capitalizeFirstLetter(mode)}
                      </Tab>
                    ))}
                  </TabGroup>

                  {/* Sort Options */}
                  <ButtonGroup>
                    {LIVE_SCORE_SORT.map(sortOption => (
                      <ControlButton
                        key={sortOption.value}
                        isActive={sortOption.value === currentSort}
                        onClick={() => handleSortChange(sortOption.value as ScoreSaberScoreSort)}
                      >
                        {sortOption.value === currentSort && (isLoading || isRefetching) ? (
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
          ) : (
            // Multi-Row Layout for Cached Mode
            <>
              {/* Mode Selection - Top Row */}
              <ControlRow>
                <TabGroup>
                  {Object.keys(SCORES_MODES).map(mode => (
                    <Tab
                      key={mode}
                      isActive={mode === scoresMode}
                      onClick={() => handleScoreModeChange(mode as ScoreSaberScoreDataMode)}
                      tooltip={SCORES_MODES[mode as ScoreSaberScoreDataMode].tooltip}
                    >
                      {SCORES_MODES[mode as ScoreSaberScoreDataMode].icon}
                      {capitalizeFirstLetter(mode)}
                    </Tab>
                  ))}
                </TabGroup>
              </ControlRow>

              {/* Sort Options - Middle Row */}
              <ControlRow>
                <ButtonGroup>
                  {CACHED_SCORE_SORT.map(sortOption => (
                    <ControlButton
                      key={sortOption.value}
                      isActive={sortOption.value === currentSort}
                      onClick={() =>
                        handleSortChange(
                          sortOption.value as ScoreSort["field"],
                          sortOption.defaultOrder as ScoreSort["direction"]
                        )
                      }
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
                  ))}
                </ButtonGroup>
              </ControlRow>

              {/* Search and Filters - Bottom Row */}
              <ControlRow className="mb-0!">
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
                      onChange={e => handleSearchChange(e.target.value)}
                    />
                    {searchTerm.length > 0 && (
                      <XIcon
                        className="text-muted-foreground absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer"
                        onClick={() => handleSearchChange("")}
                      />
                    )}
                  </div>

                  {/* Filters */}
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative flex items-center gap-2">
                      <Select
                        value={currentFilter || ""}
                        onValueChange={value => {
                          setIsLoading(true);
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                            onClick={() => {
                              setIsLoading(true);
                              setCurrentFilter("All Scores");
                              setCurrentPage(1);
                              animateLeft();
                            }}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </Button>
                        </SimpleTooltip>
                      )}
                    </div>

                    <div className="relative flex items-center gap-2">
                      <Select
                        value={hmdFilter || "All Hmds"}
                        onValueChange={value => {
                          setIsLoading(true);
                          setHmdFilter(value === "All Hmds" ? null : (value as HMD));
                          setCurrentPage(1);
                          animateLeft();
                        }}
                      >
                        <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                          <SelectValue placeholder="HMD Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={"All Hmds"}>
                            <div className="flex items-center gap-2">
                              <HMDIcon hmd={getHMDInfo("Unknown")} />
                              <span>All HMDs</span>
                            </div>
                          </SelectItem>
                          {player.hmdBreakdown &&
                            Object.keys(player.hmdBreakdown).map(filter => (
                              <SelectItem key={filter} value={filter}>
                                <div className="flex items-center gap-2">
                                  <HMDIcon hmd={getHMDInfo(filter as HMD)} />
                                  <span>{filter}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {hmdFilter && (
                        <SimpleTooltip display="Clear HMD filter">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                            onClick={() => {
                              setIsLoading(true);
                              setHmdFilter(null);
                              setCurrentPage(1);
                              animateLeft();
                            }}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </Button>
                        </SimpleTooltip>
                      )}
                    </div>
                  </div>
                </div>
              </ControlRow>
            </>
          )}
        </ControlPanel>

        {/* Scores List */}
        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
