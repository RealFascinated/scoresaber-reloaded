"use client";

import { getRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import usePageNavigation from "@/hooks/use-page-navigation";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { PlayerRanking } from "../player/player-ranking";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Input } from "../ui/input";
import { PlayerPpDisplay } from "./player-pp-display";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

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

  const firstColumnWidth = getRankingColumnWidth(
    rankingData?.items ?? [],
    player => player.rank,
    player => player.countryRank
  );

  return (
    <div className="flex w-full flex-col justify-center gap-2 xl:flex-row xl:gap-2">
      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card>
          <div className="flex w-full flex-col justify-between gap-(--spacing-sm) md:flex-row">
            <div className="flex items-center gap-(--spacing-sm)">
              {currentCountry && (
                <>
                  <CountryFlag code={currentCountry} size={18} />
                  <h1 className="text-lg font-semibold">
                    {countryFilter.find(c => c.key === currentCountry)?.friendlyName}
                  </h1>
                </>
              )}
              {!currentCountry && (
                <>
                  <GlobeAmericasIcon className="size-6" />
                  <h1 className="text-lg font-semibold">Global Players</h1>
                </>
              )}
            </div>

            {mainPlayer !== undefined && (
              <div className="bg-accent/50 flex min-w-fit items-center justify-between gap-(--spacing-lg) rounded-md px-(--spacing-lg) py-(--spacing-sm)">
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
        </Card>

        <Card className="h-fit w-full gap-4">
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
                    <div className="grow">
                      <PlayerRanking
                        player={player}
                        getRank={player => player.rank}
                        getCountryRank={player => player.countryRank}
                        firstColumnWidth={firstColumnWidth}
                        renderWorth={() => (
                          <PlayerPpDisplay
                            pp={player.pp}
                            mainPlayer={mainPlayer}
                            className="ml-auto min-w-[70px]"
                            relativePerformancePoints={showRelativePPDifference}
                          />
                        )}
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

      <div className="flex w-full flex-col gap-2 xl:w-[25%]">
        <FilterSection
          title="Filters"
          description="Filter players by country or search"
          hasActiveFilters={Boolean(currentCountry || currentSearch)}
          onClear={() => {
            setCurrentCountry(undefined);
            setCurrentSearch("");
            setCurrentPage(1);
          }}
        >
          <FilterField label="Country">
            <FilterRow>
              <Combobox<string | undefined>
                className="h-10 w-full"
                items={Object.entries(rankingData?.countryMetadata ?? {}).map(([key, count]) => ({
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
            </FilterRow>
          </FilterField>

          <FilterField label="Search">
            <FilterRow>
              <Input
                placeholder="Search for players..."
                value={currentSearch ?? ""}
                onChange={e => setCurrentSearch(e.target.value)}
                className="h-10"
              />
            </FilterRow>
          </FilterField>
        </FilterSection>
      </div>
    </div>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
  return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
}
