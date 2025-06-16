"use client";

import Card from "@/components/card";
import CountryFlag from "@/components/country-flag";
import SimplePagination from "@/components/simple-pagination";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { FilterItem } from "@ssr/common/filter-item";
import { countryFilter } from "@ssr/common/utils/country.util";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import { PlayerRanking } from "./player-ranking";
import { PlayerRankingMobile } from "./player-ranking-mobile";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string | undefined;
};

function buildPageUrl(country: string | undefined, page: number) {
  return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
}

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentCountry, setCurrentCountry] = useState(initialCountry);

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["rankingData", currentPage, currentCountry],
    queryFn: async () => {
      const players =
        currentCountry == undefined
          ? await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(currentPage)
          : await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayersByCountry(currentPage, currentCountry);
      return players && players.players.length > 0 ? players : undefined;
    },
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentCountry, currentPage));
  }, [currentPage, currentCountry]);

  return (
    <div className="flex flex-col lg:flex-row lg:gap-2 w-full justify-center">
      {/* Filters (mobile first) */}
      <Card className="h-full w-full lg:w-[25%] gap-4 order-1 lg:order-2 mb-2 lg:mb-0">
        <p className="text-lg">Filters</p>

        <div className="flex flex-col gap-4">
          <Combobox<string | undefined>
            name="Country"
            className="w-full"
            items={countryFilter
              .map(({ key, friendlyName }: FilterItem) => ({
                value: key,
                name: friendlyName,
                icon: <CountryFlag code={key} size={12} />,
              }))
              .sort((country: { value: string }) => {
                if (country.value === mainPlayer?.country) {
                  return -1;
                }
                return 1;
              })}
            value={currentCountry}
            onValueChange={(newCountry: string | undefined) => {
              setCurrentCountry(newCountry);
              setCurrentPage(1); // Reset to first page when changing country
            }}
          />

          <div className="flex gap-2">
            <div className="w-full">
              <SimpleTooltip display="Clear all current filters">
                <Button
                  onClick={() => {
                    setCurrentCountry(undefined);
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </SimpleTooltip>
            </div>
          </div>
        </div>
      </Card>

      {/* Ranking */}
      <Card className="h-full w-full lg:w-[50%] gap-4 order-2 lg:order-1">
        <div className="flex items-center justify-between gap-4 flex-col lg:flex-row">
          <div className="flex items-center gap-3 font-medium">
            {currentCountry && (
              <div className="flex items-center gap-2">
                <CountryFlag code={currentCountry} size={20} />
                <p className="text-lg">
                  Players from {countryFilter.find(c => c.key === currentCountry)?.friendlyName}
                </p>
              </div>
            )}
            {!currentCountry && <p className="text-lg">Global Players</p>}
          </div>

          {/* Relative PP Difference */}
          {mainPlayer !== undefined && (
            <div className="flex items-center gap-3 bg-accent/50 px-4 py-2 rounded-md">
              <SimpleTooltip display="The amount of pp between you and each player">
                <p className="text-sm">Relative PP</p>
              </SimpleTooltip>
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
          <FancyLoader
            title="Loading Players"
            description="Please wait while we fetch the players..."
          />
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-full mt-2 gap-3">
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
            <div className="flex flex-col gap-2">
              {rankingData.players.map((player, index) =>
                isMobile ? (
                  <PlayerRankingMobile key={player.id} player={player} />
                ) : (
                  <PlayerRanking
                    key={player.id}
                    player={player}
                    relativePerformancePoints={showRelativePPDifference}
                    mainPlayer={mainPlayer}
                  />
                )
              )}
            </div>

            <SimplePagination
              mobilePagination={isMobile}
              page={currentPage}
              totalItems={rankingData.metadata.total}
              itemsPerPage={rankingData.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? currentPage : undefined}
              generatePageUrl={page => buildPageUrl(currentCountry, page)}
              onPageChange={newPage => setCurrentPage(newPage)}
              statsBelow={true}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
