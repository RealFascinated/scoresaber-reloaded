"use client";

import { getPlayerRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useLiveQuery } from "dexie-react-hooks";
import { LinkIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import { Input } from "../ui/input";
import { PlayerRanking } from "./player-ranking";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

type RankingFiltersProps = {
  currentCountry: string | undefined;
  setCurrentCountry: (country: string | undefined) => void;
  setCurrentPage: (page: number) => void;
  currentSearch: string | undefined;
  setCurrentSearch: (search: string | undefined) => void;
  countryMetadata: Record<string, number>;
};

type RankingHeaderProps = {
  currentCountry: string | undefined;
  showRelativePPDifference: boolean;
  setShowRelativePPDifference: (show: boolean) => void;
  mainPlayer: any | undefined;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentCountry, setCurrentCountry] = useState(initialCountry);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(undefined);

  const debouncedSearch = useDebounce(currentSearch, 500);
  const isValidSearch = debouncedSearch != undefined && debouncedSearch.length >= 3;

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["rankingData", currentPage, currentCountry, isValidSearch],
    queryFn: async () =>
      ssrApi.searchPlayersRanking(currentPage, {
        country: currentCountry,
        search: isValidSearch ? debouncedSearch : undefined,
      }),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentCountry, currentPage));
  }, [currentPage, currentCountry, navigation]);

  const firstColumnWidth = useMemo(() => {
    return getPlayerRankingColumnWidth(rankingData?.items ?? []);
  }, [rankingData]);

  return (
    <div className="flex w-full flex-col justify-center xl:flex-row xl:gap-2">
      <RankingFilters
        currentCountry={currentCountry}
        setCurrentCountry={setCurrentCountry}
        setCurrentPage={setCurrentPage}
        currentSearch={currentSearch}
        setCurrentSearch={setCurrentSearch}
        countryMetadata={rankingData?.countryMetadata ?? {}}
      />

      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card>
          <RankingHeader
            currentCountry={currentCountry}
            showRelativePPDifference={showRelativePPDifference}
            setShowRelativePPDifference={setShowRelativePPDifference}
            mainPlayer={mainPlayer}
          />
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
                generatePageUrl={page => buildPageUrl(currentCountry, page)}
                onPageChange={setCurrentPage}
                showStats={false}
              />

              <div className="flex flex-col gap-2">
                {rankingData.items.map(player => (
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
                totalItems={rankingData.metadata.totalItems}
                itemsPerPage={rankingData.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? currentPage : undefined}
                generatePageUrl={page => buildPageUrl(currentCountry, page)}
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

function RankingFilters({
  currentCountry,
  setCurrentCountry,
  setCurrentPage,
  currentSearch,
  setCurrentSearch,
  countryMetadata,
}: RankingFiltersProps) {
  return (
    <Card className="order-1 mb-2 h-full w-full gap-4 xl:order-2 xl:mb-0 xl:w-[25%]">
      <p className="text-lg">Filters</p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="mb-1 text-sm font-bold">Country</label>
          <div className="flex flex-row items-center gap-2">
            <div className="flex w-full flex-col">
              <Combobox<string | undefined>
                className="w-full"
                items={Object.entries(countryMetadata).map(([key, count]) => ({
                  value: key,
                  name: (
                    <div className="flex w-full min-w-0 items-center justify-between">
                      <span className="truncate">
                        {countryFilter.find(c => c.key === key)?.friendlyName ?? key}
                      </span>
                      <span className="text-muted-foreground ml-4 text-sm whitespace-nowrap">
                        {count.toLocaleString()} players
                      </span>
                    </div>
                  ),
                  displayName: countryFilter.find(c => c.key === key)?.friendlyName ?? key,
                  icon: <CountryFlag code={key} size={12} />,
                }))}
                value={currentCountry}
                onValueChange={(newCountry: string | undefined) => {
                  setCurrentCountry(newCountry);
                  setCurrentPage(1);
                }}
                placeholder="Select country..."
              />
            </div>

            {currentCountry && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setCurrentCountry(undefined)}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-row items-center gap-2">
          <Input
            placeholder="Search for players..."
            value={currentSearch ?? ""}
            onChange={e => setCurrentSearch(e.target.value)}
            className="h-10"
          />
          {currentSearch && currentSearch.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentSearch("")}
            >
              <XIcon className="size-4" />
            </Button>
          )}
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
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="flex items-center font-medium">
        {currentCountry && (
          <div className="flex items-center gap-2">
            <CountryFlag code={currentCountry} size={18} />
            <span>
              Players from <b>{countryFilter.find(c => c.key === currentCountry)?.friendlyName}</b>
            </span>
          </div>
        )}
        {!currentCountry && (
          <div className="flex items-center gap-2">
            <GlobeAmericasIcon className="size-6" />
            <p className="text-lg">Global Players</p>
          </div>
        )}
      </div>

      {mainPlayer !== undefined && (
        <div className="bg-accent/50 flex min-w-fit items-center gap-3 rounded-md px-4 py-2">
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
