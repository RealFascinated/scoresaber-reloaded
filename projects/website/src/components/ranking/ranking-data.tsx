"use client";

import { getPlayerRankingColumnWidth } from "@/common/utils";
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
import { useEffect, useMemo, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import { PlayerRanking } from "./player-ranking";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

type RankingFiltersProps = {
  currentCountry: string | undefined;
  setCurrentCountry: (country: string | undefined) => void;
  setCurrentPage: (page: number) => void;
  mainPlayerCountry?: string;
};

type RankingHeaderProps = {
  currentCountry: string | undefined;
  showRelativePPDifference: boolean;
  setShowRelativePPDifference: (show: boolean) => void;
  mainPlayer: any | undefined;
};

function RankingFilters({
  currentCountry,
  setCurrentCountry,
  setCurrentPage,
  mainPlayerCountry,
}: RankingFiltersProps) {
  return (
    <Card className="order-1 mb-2 h-full w-full gap-4 xl:order-2 xl:mb-0 xl:w-[25%]">
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
              if (country.value === mainPlayerCountry) return -1;
              return 1;
            })}
          value={currentCountry}
          onValueChange={(newCountry: string | undefined) => {
            setCurrentCountry(newCountry);
            setCurrentPage(1);
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
  );
}

function RankingHeader({
  currentCountry,
  showRelativePPDifference,
  setShowRelativePPDifference,
  mainPlayer,
}: RankingHeaderProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
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

      {mainPlayer !== undefined && (
        <div className="bg-accent/50 flex items-center gap-3 rounded-md px-4 py-2">
          <SimpleTooltip display="The amount of pp between you and each player" showOnMobile>
            <p className="text-sm">Relative PP</p>
          </SimpleTooltip>
          <Switch
            checked={showRelativePPDifference}
            onCheckedChange={checked => setShowRelativePPDifference(checked)}
          />
        </div>
      )}
    </div>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
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
      const scoreSaberService = ApiServiceRegistry.getInstance().getScoreSaberService();
      const players =
        currentCountry == undefined
          ? await scoreSaberService.lookupPlayers(currentPage)
          : await scoreSaberService.lookupPlayersByCountry(currentPage, currentCountry);
      return players && players.players.length > 0 ? players : undefined;
    },
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentCountry, currentPage));
  }, [currentPage, currentCountry, navigation]);

  const firstColumnWidth = useMemo(() => {
    return getPlayerRankingColumnWidth(rankingData?.players ?? []);
  }, [rankingData]);

  return (
    <div className="flex w-full flex-col justify-center xl:flex-row xl:gap-2">
      <RankingFilters
        currentCountry={currentCountry}
        setCurrentCountry={setCurrentCountry}
        setCurrentPage={setCurrentPage}
        mainPlayerCountry={mainPlayer?.country}
      />

      <Card className="order-2 h-full w-full gap-4 xl:order-1 xl:w-[50%]">
        <RankingHeader
          currentCountry={currentCountry}
          showRelativePPDifference={showRelativePPDifference}
          setShowRelativePPDifference={setShowRelativePPDifference}
          mainPlayer={mainPlayer}
        />

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
            <div className="flex flex-col gap-2">
              {rankingData.players.map(player => (
                <div key={player.id} className="grid grid-cols-[1fr_25px] gap-3">
                  <div className="flex-grow">
                    <PlayerRanking
                      player={player}
                      relativePerformancePoints={showRelativePPDifference}
                      mainPlayer={mainPlayer}
                      firstColumnWidth={firstColumnWidth}
                    />
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
              totalItems={rankingData.metadata.total}
              itemsPerPage={rankingData.metadata.itemsPerPage}
              loadingPage={isLoading || isRefetching ? currentPage : undefined}
              generatePageUrl={page => buildPageUrl(currentCountry, page)}
              onPageChange={setCurrentPage}
              statsBelow={true}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
