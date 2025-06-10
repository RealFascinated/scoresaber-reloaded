"use client";

import { LoadingIcon } from "@/components/loading-icon";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
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
import { ArrowDown, ArrowUp, ClockIcon, SearchIcon, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ScoresCard from "../../score/scores-card";
import SimplePagination from "../../simple-pagination";
import { Button } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import AccSaberScoreComponent from "./score/accsaber-score";

const scoreSort = [
  { name: "AP", value: "ap", icon: <Trophy className="w-4 h-4" /> },
  { name: "Date", value: "date", icon: <ClockIcon className="w-4 h-4" /> },
  { name: "Acc", value: "acc", icon: <Target className="w-4 h-4" /> },
  { name: "Rank", value: "ranking", icon: <Trophy className="w-4 h-4" />, defaultOrder: "asc" },
];

const scoreTypes = [
  { name: "Overall", value: "overall" },
  { name: "Tech", value: "tech" },
  { name: "Standard", value: "standard" },
  { name: "True", value: "true" },
];

type Props = {
  player: ScoreSaberPlayer;
  sort: AccSaberScoreSort;
  type: AccSaberScoreType;
  order: AccSaberScoreOrder;
  page: number;
};

export default function AccSaberPlayerScores({ player, sort, page, type, order }: Props) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();

  const [currentPage, setCurrentPage] = useState(page);
  const [currentSort, setCurrentSort] = useState<AccSaberScoreSort>(sort);
  const [currentType, setCurrentType] = useState<AccSaberScoreType>(type);
  const [currentOrder, setCurrentOrder] = useState<AccSaberScoreOrder>(order);

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

  const handleSortChange = useCallback(
    async (newSort: typeof sort, defaultOrder: AccSaberScoreOrder) => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentPage(1);
        setCurrentOrder(defaultOrder);
      } else {
        setCurrentOrder(currentOrder === "desc" ? "asc" : "desc");
      }
    },
    [currentSort, currentOrder, currentType]
  );

  const getUrl = useCallback(
    (page: number) => {
      return `/player/${player.id}/accsaber/${currentSort}/${currentType}/${currentOrder}/${page}`;
    },
    [player.id, currentSort, currentType, currentOrder]
  );

  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [currentPage, player.id, currentSort, currentType, currentOrder]);

  return (
    <ScoresCard>
      <div className="w-full flex justify-center">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full sm:w-[70%] px-4 sm:px-0">
          {/* Type */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 w-full sm:w-auto">
            {scoreTypes.map(type => (
              <Button
                key={type.value}
                variant={type.value === currentType ? "default" : "outline"}
                onClick={() => setCurrentType(type.value as AccSaberScoreType)}
                size="sm"
                className="flex items-center gap-1"
              >
                {type.name}
              </Button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 w-full sm:w-auto">
            {scoreSort.map(sortOption => (
              <Button
                key={sortOption.value}
                variant={sortOption.value === currentSort ? "default" : "outline"}
                onClick={() =>
                  handleSortChange(
                    sortOption.value as AccSaberScoreSort,
                    (sortOption.defaultOrder ?? "desc") as AccSaberScoreOrder
                  )
                }
                size="sm"
                className="flex items-center gap-1"
              >
                {`${capitalizeFirstLetter(sortOption.name)}`}

                {/* Order / Icon */}
                {sortOption.value === currentSort ? (
                  currentOrder === "desc" ? (
                    <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )
                ) : (
                  sortOption.icon
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && scores === undefined && (
        <div className="flex w-full justify-center">
          <LoadingIcon />
        </div>
      )}

      {scores !== undefined && (
        <>
          <div className="text-center pt-2">
            {isError ||
              (scores.items.length === 0 && (
                <EmptyState
                  title="No Results"
                  description="No scores were found on this page"
                  icon={<SearchIcon />}
                />
              ))}
          </div>

          <div className="grid min-w-full grid-cols-1 divide-y divide-border">
            {scores.items.map((score: AccSaberScore, index: number) => (
              <div key={index}>
                <AccSaberScoreComponent key={score.id} score={score} />
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
