"use client";

import { PlatformRepository } from "@/common/platform/platform-repository";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ScoreSaberScoreDataMode } from "@ssr/common/types/score-data-mode";
import { ScoreSort } from "@ssr/common/types/sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ClockIcon,
  Filter,
  Hash,
  MusicIcon,
  SearchIcon,
  Target,
  TrendingUpIcon,
  Trophy,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { Button } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import ScoreSaberScoreDisplay from "./score/score";

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
    defaultOrder: "asc" as const,
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
];
const CACHED_SCORE_FILTERS: {
  name: string;
  value: ScoreSort["filters"];
  icon: React.ReactNode;
}[] = [
  { name: "All Scores", value: {}, icon: <Filter className="h-4 w-4" /> },
  { name: "Ranked Only", value: { rankedOnly: true }, icon: <Trophy className="h-4 w-4" /> },
  { name: "Unranked Only", value: { unrankedOnly: true }, icon: <MusicIcon className="h-4 w-4" /> },
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
  const platform = PlatformRepository.getInstance().getScoreSaberPlatform();
  const isMobile = useIsMobile();
  const database = useDatabase();
  const { changePageUrl } = usePageNavigation();
  const { animateLeft, animateRight } = usePageTransition();

  // Database queries
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());
  const showScoreComparison = useLiveQuery(() => database.getShowScoreComparison());

  // State
  const [currentPage, setCurrentPage] = useState(page);
  const [scoresMode, setScoresMode] = useState<ScoreSaberScoreDataMode>(mode);
  const [currentSort, setCurrentSort] = useState<unknown>(sort);
  const [currentSortDirection, setCurrentSortDirection] = useState<ScoreSort["direction"]>(
    direction ?? DEFAULT_CACHED_SORT_DIRECTION
  );
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const [currentFilter, setCurrentFilter] = useState<string | null>("All Scores");

  // Derived state
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const isSearchActive = useMemo(() => debouncedSearchTerm.length >= 3, [debouncedSearchTerm]);
  const invalidSearch = useMemo(
    () => searchTerm.length >= 1 && searchTerm.length < 3,
    [searchTerm]
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
        return platform.getPlayerScores(player.id, currentPage, {
          sort: currentSort as ScoreSaberScoreSort,
          search: debouncedSearchTerm,
          comparisonPlayerId: showScoreComparison && mainPlayerId ? mainPlayerId : undefined,
        });
      } else {
        // Find the selected filter
        const selectedFilter = CACHED_SCORE_FILTERS.find(filter => filter.name === currentFilter);

        const response = await ssrApi.fetchCachedScoreSaberPlayerScores(player.id, currentPage, {
          field: currentSort,
          direction: currentSortDirection,
          filters: selectedFilter ? selectedFilter.value : {},
        } as ScoreSort);
        return response || Pagination.empty();
      }
    },
    placeholderData: prev => prev,
  });

  // Event handlers
  const handleSortChange = useCallback(
    async (newSort: unknown, defaultOrder: ScoreSort["direction"] = "desc") => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentSortDirection(defaultOrder);
        setCurrentPage(1);
        animateLeft();
      } else {
        setCurrentSortDirection(currentSortDirection === "desc" ? "asc" : "desc");
        animateLeft();
      }
    },
    [currentSort, currentSortDirection, animateLeft]
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
      animateLeft();
    },
    [animateLeft]
  );

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
      if (scoresMode === "cached") {
        return `/player/${player.id}/scoresaber/${scoresMode}/${currentSort}/${currentSortDirection}/${page}${isSearchActive ? `?search=${searchTerm}` : ""}`;
      } else {
        return `/player/${player.id}/scoresaber/${scoresMode}/${currentSort}/${page}${isSearchActive ? `?search=${searchTerm}` : ""}`;
      }
    },
    [searchTerm, player.id, currentSort, currentSortDirection, isSearchActive, scoresMode]
  );

  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [
    currentPage,
    debouncedSearchTerm,
    player.id,
    isSearchActive,
    currentSort,
    currentSortDirection,
    scoresMode,
    changePageUrl,
    getUrl,
  ]);

  // Render helpers
  const renderModeButtons = () => (
    <div className="flex items-center justify-center gap-1 lg:justify-start">
      {Object.keys(SCORES_MODES).map(mode => (
        <SimpleTooltip key={mode} display={SCORES_MODES[mode as ScoreSaberScoreDataMode].tooltip}>
          <Button
            variant={mode === scoresMode ? "default" : "outline"}
            onClick={() => handleScoreModeChange(mode as ScoreSaberScoreDataMode)}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            {SCORES_MODES[mode as ScoreSaberScoreDataMode].icon}
            <span className="ml-1.5">{capitalizeFirstLetter(mode)}</span>
          </Button>
        </SimpleTooltip>
      ))}
    </div>
  );

  const renderSortButtons = () => (
    <div
      className={clsx(
        "flex items-center gap-1",
        scoresMode === "live"
          ? "flex-nowrap justify-center lg:justify-start"
          : "flex-wrap justify-center lg:max-w-2xl lg:justify-start"
      )}
    >
      {scoresMode === "live"
        ? LIVE_SCORE_SORT.map(sortOption => (
            <Button
              key={sortOption.value}
              variant={sortOption.value === currentSort ? "default" : "outline"}
              onClick={() => handleSortChange(sortOption.value as ScoreSaberScoreSort)}
              size="sm"
              className="h-8 flex-shrink-0 px-3 text-xs"
            >
              {sortOption.icon}
              <span className="ml-1.5">{capitalizeFirstLetter(sortOption.name)}</span>
            </Button>
          ))
        : CACHED_SCORE_SORT.map(sortOption => (
            <Button
              key={sortOption.value}
              variant={sortOption.value === currentSort ? "default" : "outline"}
              onClick={() =>
                handleSortChange(
                  sortOption.value as ScoreSort["field"],
                  sortOption.defaultOrder as ScoreSort["direction"]
                )
              }
              size="sm"
              className="h-8 flex-shrink-0 px-3 text-xs"
            >
              {sortOption.value === currentSort ? (
                currentSortDirection === "desc" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )
              ) : (
                sortOption.icon
              )}
              <span className="ml-1.5">{capitalizeFirstLetter(sortOption.name)}</span>
            </Button>
          ))}
    </div>
  );

  const renderFilters = () => (
    <div className="flex items-center justify-center gap-1 lg:justify-start">
      <div className="flex items-center gap-2">
        <Select
          value={currentFilter || ""}
          onValueChange={value => {
            if (value === "clear") {
              setCurrentFilter("All Scores");
            } else {
              setCurrentFilter(value);
            }
            setCurrentPage(1);
            animateLeft();
          }}
        >
          <SelectTrigger className="h-8 w-44 cursor-pointer px-3 text-xs">
            <SelectValue placeholder="Filters" />
          </SelectTrigger>
          <SelectContent>
            {CACHED_SCORE_FILTERS.map(filter => (
              <SelectItem key={filter.name} value={filter.name}>
                <div className="flex cursor-pointer items-center gap-2">
                  {filter.icon}
                  <span>{filter.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentFilter && currentFilter !== "All Scores" && (
          <SimpleTooltip display="Clear filters">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentFilter("All Scores");
                setCurrentPage(1);
                animateLeft();
              }}
              className="h-8 w-8 p-0 text-red-500"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        )}
      </div>
    </div>
  );

  const renderSearchInput = () => (
    <div
      className={clsx("flex justify-center lg:flex-shrink-0", scoresMode === "cached" && "hidden")}
    >
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search scores..."
          className={clsx(
            "h-8 w-52 pl-9 transition-all sm:w-64",
            invalidSearch && "border-red-500"
          )}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
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

        {scores.metadata.totalPages > 1 && (
          <SimplePagination
            mobilePagination={isMobile}
            page={currentPage}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? currentPage : undefined}
            generatePageUrl={getUrl}
            onPageChange={handlePageChange}
          />
        )}
      </>
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            {scoresMode === "live" ? (
              // Live mode: mode and sort buttons next to each other with spacer on mobile
              <div className="flex items-center justify-center gap-1.5 lg:justify-start lg:gap-4">
                <div className="flex items-center justify-center gap-1 lg:justify-start">
                  {Object.keys(SCORES_MODES).map(mode => (
                    <SimpleTooltip
                      key={mode}
                      display={SCORES_MODES[mode as ScoreSaberScoreDataMode].tooltip}
                    >
                      <Button
                        variant={mode === scoresMode ? "default" : "outline"}
                        onClick={() => handleScoreModeChange(mode as ScoreSaberScoreDataMode)}
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        {SCORES_MODES[mode as ScoreSaberScoreDataMode].icon}
                        <span className="ml-1.5">{capitalizeFirstLetter(mode)}</span>
                      </Button>
                    </SimpleTooltip>
                  ))}
                </div>

                {/* Vertical spacer for mobile */}
                <div className="bg-border h-6 w-px" />

                <div className="flex items-center justify-center gap-1 lg:justify-start">
                  {LIVE_SCORE_SORT.map(sortOption => (
                    <Button
                      key={sortOption.value}
                      variant={sortOption.value === currentSort ? "default" : "outline"}
                      onClick={() => handleSortChange(sortOption.value as ScoreSaberScoreSort)}
                      size="sm"
                      className="h-8 flex-shrink-0 px-3 text-xs"
                    >
                      {sortOption.icon}
                      <span className="ml-1.5">{capitalizeFirstLetter(sortOption.name)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              // Cached mode: keep current layout
              <>
                {renderModeButtons()}

                {/* Divider */}
                <div className="bg-border hidden h-6 w-px lg:block" />

                {renderSortButtons()}
              </>
            )}
          </div>

          {scoresMode === "cached" && renderFilters()}
          {renderSearchInput()}
        </div>

        {/* Scores List */}
        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
