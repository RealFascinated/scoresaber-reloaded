"use client";

import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import {
  AccSaberScore,
  AccSaberScoreOrder,
  AccSaberScoreSort,
  AccSaberScoreType,
} from "@ssr/common/api-service/impl/accsaber";
import { Page } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ClockIcon,
  Crosshair,
  Gauge,
  SearchIcon,
  Target,
  Trophy,
  Zap,
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
import PageTransition from "../../ui/page-transition";
import { usePageTransition } from "../../ui/page-transition-context";
import AccSaberScoreComponent from "./score/accsaber-score";

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_SORT: AccSaberScoreSort = "ap";
const DEFAULT_TYPE: AccSaberScoreType = "overall";
const DEFAULT_ORDER: AccSaberScoreOrder = "desc";

const scoreSort = [
  { name: "AP", value: "ap", icon: <Trophy className="h-4 w-4" /> },
  { name: "Date", value: "date", icon: <ClockIcon className="h-4 w-4" /> },
  { name: "Acc", value: "acc", icon: <Target className="h-4 w-4" /> },
  { name: "Rank", value: "ranking", icon: <Trophy className="h-4 w-4" />, defaultOrder: "asc" },
];

const scoreTypes = [
  { name: "Overall", value: "overall", icon: <BarChart3 className="h-4 w-4" /> },
  { name: "Tech Acc", value: "tech", icon: <Zap className="h-4 w-4" /> },
  { name: "Standard Acc", value: "standard", icon: <Gauge className="h-4 w-4" /> },
  { name: "True Acc", value: "true", icon: <Crosshair className="h-4 w-4" /> },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function AccSaberPlayerScores({ player }: Props) {
  const isMobile = useIsMobile();
  const { animateLeft, animateRight } = usePageTransition();

  // State
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(DEFAULT_PAGE)
  );
  const [currentSort, setCurrentSort] = useQueryState(
    "sort",
    parseAsString.withDefault(DEFAULT_SORT)
  ) as [AccSaberScoreSort, (value: AccSaberScoreSort) => void];
  const [currentType, setCurrentType] = useQueryState(
    "type",
    parseAsString.withDefault(DEFAULT_TYPE)
  ) as [AccSaberScoreType, (value: AccSaberScoreType) => void];
  const [currentOrder, setCurrentOrder] = useQueryState(
    "order",
    parseAsString.withDefault(DEFAULT_ORDER)
  ) as [AccSaberScoreOrder, (value: AccSaberScoreOrder) => void];

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      `${player.name} / AccSaber / ${currentPage} / ${capitalizeFirstLetter(currentType)} / ${scoreSort.find(sort => sort.value === currentSort)?.name}`
    )
  );

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<Page<AccSaberScore>>({
    queryKey: [
      "accsaber-player-scores",
      player.id,
      currentPage,
      currentType,
      currentSort,
      currentOrder,
    ],
    queryFn: () =>
      ApiServiceRegistry.getInstance()
        .getAccSaberService()
        .getPlayerScores(player.id, currentPage, {
          order: currentOrder,
          sort: currentSort,
          type: currentType,
        }),
    placeholderData: prev => prev,
  });

  const getUrl = useCallback(
    (page: number, sort?: string, type?: string, order?: string) => {
      const params = new URLSearchParams();

      if (page !== DEFAULT_PAGE) params.set("page", page.toString());
      if ((sort || currentSort) !== DEFAULT_SORT) params.set("sort", sort || currentSort);
      if ((type || currentType) !== DEFAULT_TYPE) params.set("type", type || currentType);
      if ((order || currentOrder) !== DEFAULT_ORDER) params.set("order", order || currentOrder);

      const queryString = params.toString();
      return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    },
    [currentSort, currentType, currentOrder]
  );

  const handleSortChange = useCallback(
    async (newSort: AccSaberScoreSort, defaultOrder: AccSaberScoreOrder) => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentOrder(defaultOrder);
        setCurrentPage(1);
      } else {
        setCurrentOrder(currentOrder === "desc" ? "asc" : "desc");
      }
    },
    [currentSort, currentOrder, setCurrentSort, setCurrentOrder, setCurrentPage]
  );

  const handleTypeChange = useCallback(
    (newType: AccSaberScoreType) => {
      if (newType !== currentType) {
        setCurrentType(newType);
        setCurrentPage(1);
      }
    },
    [currentType, setCurrentType, setCurrentPage]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
    },
    [setCurrentPage]
  );

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {/* Type Selection - Top Row */}
          <ControlRow>
            <TabGroup>
              {scoreTypes.map(type => {
                const url = getUrl(1, currentSort, currentOrder, type.value);

                return (
                  <Tab key={type.value} isActive={type.value === currentType} href={url}>
                    {type.icon}
                    {type.name}
                  </Tab>
                );
              })}
            </TabGroup>
          </ControlRow>

          {/* Sort Options - Middle Row */}
          <ControlRow className="!mb-0">
            <ButtonGroup>
              {scoreSort.map(sortOption => {
                const url = getUrl(
                  1,
                  sortOption.value,
                  currentType,
                  sortOption.defaultOrder || "desc"
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
                      ) : currentOrder === "desc" ? (
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
        </ControlPanel>

        {/* Scores List */}
        {isLoading && scores === undefined && (
          <div className="flex w-full justify-center py-8">
            <Spinner size="md" className="text-primary" />
          </div>
        )}

        {scores && (
          <>
            <div className="text-center">
              {isError ||
                (scores.items.length === 0 && (
                  <EmptyState
                    title="No Results"
                    description="No scores were found on this page"
                    icon={<SearchIcon />}
                  />
                ))}
            </div>

            <PageTransition className="divide-border grid min-w-full grid-cols-1 divide-y">
              {scores.items.map((score: AccSaberScore, index: number) => (
                <AccSaberScoreComponent key={score.id} score={score} />
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
        )}
      </div>
    </ScoresCard>
  );
}
