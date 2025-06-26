"use client";

import { getMedalRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { Button } from "../ui/button";
import { PlayerMedalRanking } from "./player-medal-ranking";

type RankingDataProps = {
  initialPage: number;
};

export default function RankingData({ initialPage }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(initialPage);

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["medalRankingData", currentPage],
    queryFn: async () => ssrApi.getMedalRankedPlayers(currentPage),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentPage));
  }, [currentPage, navigation]);

  const firstColumnWidth = useMemo(() => {
    return getMedalRankingColumnWidth(rankingData?.items ?? []);
  }, [rankingData]);

  return (
    <div className="flex w-full flex-col justify-center xl:flex-row xl:gap-2">
      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card>
          <p className="text-lg">Medal Ranking</p>
        </Card>

        <Card className="order-2 h-full w-full gap-4 xl:order-1">
          {!rankingData && !isError && (
            <FancyLoader
              title="Loading Players"
              description="Please wait while we fetch the players..."
            />
          )}

          {isError && (
            <div className="mt-2 flex h-full flex-col items-center justify-center gap-3">
              <p className="text-lg">No players were found for this country or page.</p>
              <Link href="/ranking">
                <Button variant="outline" className="gap-2">
                  Back to Global
                  <LinkIcon className="size-4" />
                </Button>
              </Link>
            </div>
          )}

          {rankingData && (
            <div className="flex flex-col gap-4">
              <SimplePagination
                mobilePagination={isMobile}
                page={currentPage}
                totalItems={rankingData.metadata.totalItems}
                itemsPerPage={rankingData.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? currentPage : undefined}
                generatePageUrl={page => buildPageUrl(page)}
                onPageChange={setCurrentPage}
                showStats={false}
              />

              <div className="flex flex-col gap-2">
                {rankingData.items.map(player => (
                  <div key={player.id} className="grid grid-cols-[1fr_25px] gap-3">
                    <div className="flex-grow">
                      <PlayerMedalRanking player={player} firstColumnWidth={firstColumnWidth} />
                    </div>

                    <div className="flex h-full w-full items-center justify-center">
                      <AddFriend player={player} className="bg-ssr rounded-full p-1.5" iconOnly />
                    </div>
                  </div>
                ))}
              </div>

              <SimplePagination
                mobilePagination={isMobile}
                page={currentPage}
                totalItems={rankingData.metadata.totalItems}
                itemsPerPage={rankingData.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? currentPage : undefined}
                generatePageUrl={page => buildPageUrl(page)}
                onPageChange={setCurrentPage}
                showStats={false}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function buildPageUrl(page: number): string {
  return `/medals/${page}`;
}
