"use client";

import { cn } from "@/common/utils";
import HMDIcon from "@/components/hmd-icon";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/ui/page-transition";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { useIsMobile } from "@/contexts/viewport-context";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
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
  Trophy,
  XIcon,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { ButtonGroup, ControlButton, ControlPanel, ControlRow } from "../../ui/control-panel";
import { EmptyState } from "../../ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";
import { ScoreSaberScoreModeTabs } from "./scoresaber-score-mode-selector";

const DEFAULT_SORT: ScoreSort["field"] = "date";
const DEFAULT_SORT_DIRECTION: ScoreSort["direction"] = "desc";
const DEFAULT_PAGE = 1;
const DEFAULT_FILTER = "All Scores";

const SORT_OPTIONS: {
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

const FILTERS: {
  name: string;
  value: ScoreSort["filters"];
  icon: React.ReactNode;
}[] = [
  { name: "All Scores", value: {}, icon: <Filter className="h-4 w-4" /> },
  { name: "Ranked Only", value: { rankedOnly: true }, icon: <Trophy className="h-4 w-4" /> },
  { name: "Unranked Only", value: { unrankedOnly: true }, icon: <MusicIcon className="h-4 w-4" /> },
  { name: "Passed Only", value: { passedOnly: true }, icon: <CheckIcon className="h-4 w-4" /> },
];

interface ScoreSaberPlayerScoresSSRProps {
  player: ScoreSaberPlayer;
}

export default function ScoreSaberPlayerScoresSSR({ player }: ScoreSaberPlayerScoresSSRProps) {
  const isMobile = useIsMobile();
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  // Sorting
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(DEFAULT_PAGE));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(DEFAULT_SORT)) as [
    ScoreSort["field"],
    (value: ScoreSort["field"] | null) => void,
  ];
  const [direction, setDirection] = useQueryState(
    "direction",
    parseAsString.withDefault(DEFAULT_SORT_DIRECTION)
  ) as [ScoreSort["direction"], (value: ScoreSort["direction"] | null) => void];

  // Filters
  const [scoreFilter, setScoreFilter] = useQueryState(
    "scores",
    parseAsString.withDefault(DEFAULT_FILTER)
  ) as [string | null, (value: string | null) => void];
  const [hmdFilter, setHmdFilter] = useQueryState("hmd", parseAsString) as [
    HMD | null,
    (value: HMD | null) => void,
  ];

  // Search
  const [search, setSearch] = useQueryState("search", parseAsString);
  const debouncedSearchTerm = useDebounce(search || "", 250);
  const invalidSearch = search && search.length >= 1 && search.length < 3;

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      `${player.name} / ScoreSaber / ${page} / ${SORT_OPTIONS.find(s => s.value === sort)?.name} / ${capitalizeFirstLetter(direction)}`
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
  } = useQuery<PlayerScoresResponse>({
    queryKey: [
      "playerScores:ssr",
      player.id,
      page,
      sort,
      debouncedSearchTerm,
      direction,
      scoreFilter,
      hmdFilter,
    ],
    queryFn: async () => {
      const selectedFilter = FILTERS.find(f => f.name === scoreFilter);

      const response = await ssrApi.fetchSSRPlayerScores(
        player.id,
        page,
        {
          field: sort,
          direction,
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
    },
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  const handleSortChange = useCallback(
    (newSort: ScoreSort["field"], defaultOrder: ScoreSort["direction"] = "desc") => {
      setIsLoading(true);
      if (newSort !== sort) {
        setSort(newSort);
        setDirection(defaultOrder);
        setPage(1);
        const defaultFilter = SORT_OPTIONS.find(s => s.value === newSort)?.defaultFilter;
        const filterName =
          FILTERS.find(f => JSON.stringify(f.value) === JSON.stringify(defaultFilter ?? {}))
            ?.name ?? "All Scores";
        setScoreFilter(filterName);
        animateLeft();
      } else {
        setDirection(direction === "desc" ? "asc" : "desc");
        animateLeft();
      }
    },
    [sort, direction, setSort, setDirection, setPage, animateLeft, setIsLoading]
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
      params.set("mode", "ssr");
      if (sort !== DEFAULT_SORT) params.set("sort", sort);
      if (direction !== DEFAULT_SORT_DIRECTION) params.set("direction", direction);
      if (pageNum !== 1) params.set("page", String(pageNum));
      if (debouncedSearchTerm && debouncedSearchTerm.length >= 3)
        params.set("search", debouncedSearchTerm);
      if (scoreFilter && scoreFilter !== "All Scores") params.set("filter", scoreFilter);
      const queryString = params.toString();
      return `/player/${player.id}/scoresaber?${queryString}`;
    },
    [player.id, sort, direction, debouncedSearchTerm, scoreFilter]
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
              settings={{
                defaultLeaderboardScoresPage: 1,
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
    );
  };

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        <ControlPanel>
          <ControlRow>
            <ScoreSaberScoreModeTabs />
          </ControlRow>
          <ControlRow>
            <ButtonGroup>
              {SORT_OPTIONS.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === sort}
                  onClick={() =>
                    handleSortChange(
                      sortOption.value,
                      sortOption.defaultOrder as ScoreSort["direction"]
                    )
                  }
                >
                  {sortOption.value === sort ? (
                    isLoading || isRefetching ? (
                      <Spinner size="sm" className="h-3.5 w-3.5" />
                    ) : direction === "desc" ? (
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

          <ControlRow className="mb-0!">
            <div className="flex w-full flex-col-reverse items-center gap-2 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-auto">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Query..."
                  className={cn(
                    "h-8 w-full pr-3 pl-8 text-xs sm:w-64",
                    invalidSearch && "border-red-500"
                  )}
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

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Select
                  value={scoreFilter || ""}
                  onValueChange={value => {
                    setIsLoading(true);
                    setScoreFilter(value);
                    setPage(1);
                    animateLeft();
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-full text-xs sm:w-46"
                    showClearButton={!!(scoreFilter && scoreFilter !== "All Scores")}
                    onClear={() => {
                      setIsLoading(true);
                      setScoreFilter("All Scores");
                      setPage(1);
                      animateLeft();
                    }}
                  >
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTERS.map(filterOption => (
                      <SelectItem key={filterOption.name} value={filterOption.name}>
                        <div className="flex items-center gap-2">
                          {filterOption.icon}
                          <span>{filterOption.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={hmdFilter || "All Hmds"}
                  onValueChange={value => {
                    setIsLoading(true);
                    setHmdFilter(value === "All Hmds" ? null : (value as HMD));
                    setPage(1);
                    animateLeft();
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-full text-xs sm:w-42"
                    showClearButton={!!hmdFilter}
                    onClear={() => {
                      setIsLoading(true);
                      setHmdFilter(null);
                      setPage(1);
                      animateLeft();
                    }}
                  >
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
              </div>
            </div>
          </ControlRow>
        </ControlPanel>

        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
