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
import type { Page } from "@ssr/common/pagination";
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
import { useCallback, useEffect } from "react";
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

const DEFAULT_SORT: AccSaberScoreSort = "date";
const DEFAULT_TYPE: AccSaberScoreType = "overall";
const DEFAULT_ORDER: AccSaberScoreOrder = "desc";
const DEFAULT_PAGE = 1;

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
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  // Query params
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(DEFAULT_SORT)) as [
    AccSaberScoreSort,
    (value: AccSaberScoreSort | null) => void,
  ];
  const [type, setType] = useQueryState("type", parseAsString.withDefault(DEFAULT_TYPE)) as [
    AccSaberScoreType,
    (value: AccSaberScoreType | null) => void,
  ];
  const [order, setOrder] = useQueryState("order", parseAsString.withDefault(DEFAULT_ORDER)) as [
    AccSaberScoreOrder,
    (value: AccSaberScoreOrder | null) => void,
  ];
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(DEFAULT_PAGE));

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      `${player.name} / AccSaber / ${page} / ${capitalizeFirstLetter(type)} / ${scoreSort.find(s => s.value === sort)?.name}`
    )
  );

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useQuery<Page<AccSaberScore>>({
    queryKey: ["playerScores:accsaber", player.id, page, type, sort, order],
    queryFn: () =>
      ApiServiceRegistry.getInstance().getAccSaberService().getPlayerScores(player.id, page, {
        order: order,
        sort: sort,
        type: type,
      }),
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, scores, setIsLoading]);

  const handleSortChange = useCallback(
    async (newSort: AccSaberScoreSort, defaultOrder: AccSaberScoreOrder) => {
      if (newSort !== sort) {
        setSort(newSort);
        setOrder(defaultOrder);
        setPage(1);
        animateLeft();
      } else {
        setOrder(order === "desc" ? "asc" : "desc");
        animateLeft();
      }
    },
    [sort, order, animateLeft, setSort, setOrder, setPage]
  );

  const handleTypeChange = useCallback(
    (newType: AccSaberScoreType) => {
      if (newType !== type) {
        setType(newType);
        setPage(1);
        animateLeft();
      }
    },
    [type, animateLeft, setType, setPage]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage > page) {
        animateLeft();
      } else {
        animateRight();
      }
      setPage(newPage);
    },
    [page, animateLeft, animateRight, setPage]
  );

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      if (sort !== "date") params.set("sort", sort);
      if (type !== "overall") params.set("type", type);
      if (order !== "desc") params.set("order", order);
      if (pageNum !== 1) params.set("page", String(pageNum));
      const queryString = params.toString();
      return `/player/${player.id}/accsaber${queryString ? `?${queryString}` : ""}`;
    },
    [player.id, sort, type, order]
  );

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {/* Type Selection - Top Row */}
          <ControlRow>
            <TabGroup>
              {scoreTypes.map(typeOption => (
                <Tab
                  key={typeOption.value}
                  isActive={typeOption.value === type}
                  onClick={() => handleTypeChange(typeOption.value as AccSaberScoreType)}
                >
                  {typeOption.icon}
                  {typeOption.name}
                </Tab>
              ))}
            </TabGroup>
          </ControlRow>

          {/* Sort Options - Middle Row */}
          <ControlRow className="mb-0!">
            <ButtonGroup>
              {scoreSort.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === sort}
                  onClick={() =>
                    handleSortChange(
                      sortOption.value as AccSaberScoreSort,
                      (sortOption.defaultOrder ?? "desc") as AccSaberScoreOrder
                    )
                  }
                >
                  {sortOption.value === sort ? (
                    isLoading || isRefetching ? (
                      <Spinner size="sm" className="h-3.5 w-3.5" />
                    ) : order === "desc" ? (
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
                    className="border-border rounded-lg border"
                    title="No Results"
                    description="No scores were found on this page"
                    icon={<SearchIcon />}
                  />
                ))}
            </div>

            <PageTransition className="divide-border grid min-w-full grid-cols-1 divide-y">
              {scores.items.map(score => (
                <AccSaberScoreComponent key={score.id} score={score} />
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
        )}
      </div>
    </ScoresCard>
  );
}
