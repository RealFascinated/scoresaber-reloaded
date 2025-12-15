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
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { SortDirection, SortField } from "@ssr/common/types/score-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce, useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { ArrowDown, ArrowUp, BarChart3, ClockIcon, Hash, SearchIcon, Target, Trophy, XIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { ButtonGroup, ControlButton, ControlPanel, ControlRow } from "../../ui/control-panel";
import { EmptyState } from "../../ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";
import { ScoreSaberScoreModeTabs } from "./scoresaber-score-mode-selector";

type SortOption = {
  name: string;
  value: SortField;
  icon: React.ReactNode;
  defaultOrder: SortDirection;
};
type Mode = "ssr" | "medals";

const DEFAULT_SORT: SortField = "date";
const DEFAULT_SORT_DIRECTION: SortDirection = "desc";
const DEFAULT_PAGE = 1;

const SORT_OPTIONS: SortOption[] = [
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
];
const MODE_NAME: Record<Mode, string> = {
  ssr: "SSR",
  medals: "Medals",
};

export default function ScoreSaberPlayerScoresSSR({ player, mode }: { player: ScoreSaberPlayer; mode: Mode }) {
  const isMobile = useIsMobile();
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  // Sorting
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(DEFAULT_PAGE));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(DEFAULT_SORT)) as [
    SortField,
    (value: SortField | null) => void,
  ];
  const [direction, setDirection] = useQueryState("direction", parseAsString.withDefault(DEFAULT_SORT_DIRECTION)) as [
    SortDirection,
    (value: SortDirection | null) => void,
  ];

  // Filters
  const [hmdFilter, setHmdFilter] = useQueryState("hmd", parseAsString) as [HMD | null, (value: HMD | null) => void];

  const sortOptions: SortOption[] = [
    ...(mode === "ssr"
      ? ([
          {
            name: "PP",
            value: "pp",
            icon: <Trophy className="h-4 w-4" />,
            defaultOrder: "desc" as const,
          },
        ] as SortOption[])
      : ([
          {
            name: "Medals",
            value: "medals",
            icon: <Trophy className="h-4 w-4" />,
            defaultOrder: "desc" as const,
          },
        ] as SortOption[])),
    ...SORT_OPTIONS,
  ];

  // Search
  const [search, setSearch] = useQueryState("search", parseAsString);
  const debouncedSearchTerm = useDebounce(search || "", 250);
  const invalidSearch = search && search.length >= 1 && search.length < 3;

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      `${player.name} / ${MODE_NAME[mode]} / ${page} / ${sortOptions.find(s => s.value === sort)?.name} / ${capitalizeFirstLetter(direction)}`
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
    queryKey: ["playerScores:" + mode, player.id, page, sort, debouncedSearchTerm, direction, hmdFilter],
    queryFn: async () => {
      const response = await ssrApi.fetchPlayerScores(player.id, mode, page, sort, direction, {
        ...(!invalidSearch ? { search: debouncedSearchTerm } : {}),
        ...(hmdFilter ? { hmd: hmdFilter } : {}),
      });
      return response || Pagination.empty();
    },
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  const handleSortChange = useCallback(
    (newSort: SortField, defaultOrder: SortDirection = "desc") => {
      setIsLoading(true);
      if (newSort !== sort) {
        setSort(newSort);
        setDirection(defaultOrder);
        setPage(1);
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
      if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) params.set("search", debouncedSearchTerm);

      const queryString = params.toString();
      return `/player/${player.id}/scoresaber?${queryString}`;
    },
    [player.id, sort, direction, debouncedSearchTerm]
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
                medalsMode: mode === "medals",
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
          {mode === "ssr" && (
            <ControlRow>
              <ScoreSaberScoreModeTabs />
            </ControlRow>
          )}
          <ControlRow>
            <ButtonGroup>
              {sortOptions.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === sort}
                  onClick={() => handleSortChange(sortOption.value, sortOption.defaultOrder as SortDirection)}
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

              {mode === "ssr" && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
                        Object.keys(player.hmdBreakdown)
                          .filter(filter => filter !== "Unknown")
                          .map(filter => (
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
              )}
            </div>
          </ControlRow>
        </ControlPanel>

        {renderScoresList()}
      </div>
    </ScoresCard>
  );
}
