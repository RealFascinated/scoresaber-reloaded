"use client";

import Card from "@/components/card";
import CountryFlag from "@/components/country-flag";
import { PlayerRanking } from "@/components/ranking/player-ranking";
import SimplePagination from "@/components/simple-pagination";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingIcon } from "../loading-icon";
import { Button } from "../ui/button";

type RankingDataProps = {
  initialPage: number;
  country?: string | undefined;
};

function buildPageUrl(country: string | undefined, page: number) {
  return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
}

export default function RankingData({ initialPage, country }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["rankingData", currentPage, country],
    queryFn: async () => {
      const players =
        country == undefined
          ? await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(currentPage)
          : await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayersByCountry(currentPage, country);
      return players && players.players.length > 0 ? players : undefined;
    },
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(country, currentPage));
  }, [currentPage, country]);

  return (
    <Card className="h-full w-full xl:max-w-[85%] gap-2">
      <div className="flex items-center justify-between gap-2 flex-col lg:flex-row">
        <div className="flex items-center gap-2 font-semibold">
          {country && <CountryFlag code={country} size={16} />}
          <p>
            Viewing{" "}
            {country
              ? "players from " + normalizedRegionName(country.toUpperCase())
              : "Global players"}
          </p>
        </div>

        {/* Relative PP Difference */}
        {mainPlayer !== undefined && (
          <div className="flex items-center gap-2">
            <p>Toggle relative pp difference</p>
            <Switch
              checked={showRelativePPDifference}
              onCheckedChange={checked => {
                setShowRelativePPDifference(checked);
              }}
            />
          </div>
        )}
      </div>

      {!rankingData && !isError && (
        <div className="flex flex-col items-center justify-center h-full mt-2">
          <LoadingIcon />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center h-full mt-2 gap-2">
          <p>No players were found for this country or page.</p>
          <Link href="/ranking">
            <Button variant="outline">
              Back to Global
              <LinkIcon className="size-3.5 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {rankingData && (
        <div className="flex flex-col gap-2">
          <div className="overflow-x-scroll lg:overflow-x-hidden">
            <table className="table w-full table-auto border-spacing-2 border-none text-left">
              <thead>
                <tr>
                  <th className="px-2 py-1 min-w-fit">Rank</th>
                  <th className="px-2 py-1">Player</th>
                  <th className="px-2 py-1 text-center">Performance Points</th>
                  <th className="px-2 py-1 text-center">Total Plays</th>
                  <th className="px-2 py-1 text-center">Total Ranked Plays</th>
                  <th className="px-2 py-1 text-center">Avg Ranked Accuracy</th>
                  <th className="px-2 py-1 text-center">Weekly Change</th>

                  {/* Friend Button */}
                  <th className="px-2 py-1 text-center"></th>
                </tr>
              </thead>

              {/* Players */}
              <tbody>
                {rankingData.players.map((player, index) => (
                  <tr key={index} className="border-b border-border">
                    <PlayerRanking
                      isCountry={country != undefined}
                      player={player}
                      relativePerformancePoints={showRelativePPDifference}
                      mainPlayer={mainPlayer}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <SimplePagination
            mobilePagination={isMobile}
            page={currentPage}
            totalItems={rankingData.metadata.total}
            itemsPerPage={rankingData.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? currentPage : undefined}
            generatePageUrl={page => buildPageUrl(country, page)}
            onPageChange={newPage => setCurrentPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
