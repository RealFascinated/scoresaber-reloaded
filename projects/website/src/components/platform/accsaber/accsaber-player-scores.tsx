"use client";

import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
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
import PageTransition from "../../ui/page-transition";
import { usePageTransition } from "../../ui/page-transition-context";
import AccSaberScoreComponent from "./score/accsaber-score";

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
  sort: AccSaberScoreSort;
  type: AccSaberScoreType;
  order: AccSaberScoreOrder;
  page: number;
};

export default function AccSaberPlayerScores({ player, sort, page, type, order }: Props) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();
  const { animateLeft, animateRight } = usePageTransition();
  const [currentPage, setCurrentPage] = useState(page);

  const [currentSort, setCurrentSort] = useState<AccSaberScoreSort>(sort);
  const [currentType, setCurrentType] = useState<AccSaberScoreType>(type);
  const [currentOrder, setCurrentOrder] = useState<AccSaberScoreOrder>(order);

  // Animation
  const [pendingAnimation, setPendingAnimation] = useState<"left" | "right" | null>("left");
  const [previousScores, setPreviousScores] = useState<Page<AccSaberScore> | undefined>(undefined);

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

  const handleSortChange = useCallback(
    async (newSort: typeof sort, defaultOrder: AccSaberScoreOrder) => {
      if (newSort !== currentSort) {
        setCurrentSort(newSort);
        setCurrentOrder(defaultOrder);
        setCurrentPage(1);
        setPendingAnimation("left");
      } else {
        setCurrentOrder(currentOrder === "desc" ? "asc" : "desc");
        setPendingAnimation("left");
      }
    },
    [currentSort, currentOrder, currentType]
  );

  const handleTypeChange = useCallback(
    (newType: AccSaberScoreType) => {
      if (newType !== currentType) {
        setCurrentType(newType);
        setCurrentPage(1);
        setPendingAnimation("left");
      }
    },
    [currentType]
  );

  const getUrl = useCallback(
    (page: number) => {
      return `/player/${player.id}/accsaber/${currentSort}/${currentType}/${currentOrder}/${page}`;
    },
    [player.id, currentSort, currentType, currentOrder]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) {
      setPendingAnimation("left");
    } else {
      setPendingAnimation("right");
    }
    setCurrentPage(newPage);
  };

  useEffect(() => {
    changePageUrl(getUrl(currentPage));
  }, [currentPage, player.id, currentSort, currentType, currentOrder]);

  useEffect(() => {
    if (pendingAnimation && !isLoading) {
      if (pendingAnimation === "left") {
        animateLeft();
      } else {
        animateRight();
      }
      setPendingAnimation(null);
      setPreviousScores(scores);
    }
  }, [pendingAnimation, animateLeft, animateRight, isLoading]);

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {/* Type Selection - Top Row */}
          <ControlRow>
            <TabGroup>
              {scoreTypes.map(type => (
                <Tab
                  key={type.value}
                  isActive={type.value === currentType}
                  onClick={() => handleTypeChange(type.value as AccSaberScoreType)}
                >
                  {type.icon}
                  {type.name}
                </Tab>
              ))}
            </TabGroup>
          </ControlRow>

          {/* Sort Options - Middle Row */}
          <ControlRow className="!mb-0">
            <ButtonGroup>
              {scoreSort.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === currentSort}
                  onClick={() =>
                    handleSortChange(
                      sortOption.value as AccSaberScoreSort,
                      (sortOption.defaultOrder ?? "desc") as AccSaberScoreOrder
                    )
                  }
                >
                  {sortOption.value === currentSort ? (
                    isLoading || isRefetching || pendingAnimation ? (
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

        {previousScores !== undefined && (
          <>
            <div className="text-center">
              {isError ||
                (previousScores.items.length === 0 && (
                  <EmptyState
                    title="No Results"
                    description="No scores were found on this page"
                    icon={<SearchIcon />}
                  />
                ))}
            </div>

            <PageTransition className="divide-border grid min-w-full grid-cols-1 divide-y">
              {previousScores.items.map((score: AccSaberScore, index: number) => (
                <AccSaberScoreComponent key={score.id} score={score} />
              ))}
            </PageTransition>

            <SimplePagination
              mobilePagination={isMobile}
              page={currentPage}
              totalItems={previousScores.metadata.totalItems}
              itemsPerPage={previousScores.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching || pendingAnimation ? currentPage : undefined}
              generatePageUrl={page => getUrl(page)}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </ScoresCard>
  );
}
