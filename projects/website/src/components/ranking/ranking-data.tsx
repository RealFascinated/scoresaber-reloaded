"use client";

import { getRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import CountrySelector from "@/components/country-selector";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { ScoreSaberPlayerRanking } from "../player/player-ranking";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Input } from "../ui/input";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
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
      <div className="flex w-full flex-col gap-2 xl:w-[750px]">
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
              <div className="bg-accent/50 flex min-w-fit items-center justify-between gap-(--spacing-lg) rounded-md px-(--spacing-sm) py-(--spacing-xs)">
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
            <FancyLoader title="Loading Players" description="Please wait while we fetch the players..." />
          )}

          {isError && (
            <div className="mt-2 flex h-full flex-col items-center justify-center gap-3">
              <p className="text-lg">No players were found for this country or page.</p>
              <SimpleLink href="/ranking">
                <Button variant="outline" className="gap-2">
                  Back to Global
                  <LinkIcon className="size-4" />
                </Button>
              </SimpleLink>
            </div>
          )}

          {rankingData && (
            <div className="flex flex-col gap-4">
              <SimplePagination
                page={currentPage}
                totalItems={rankingData.metadata.totalItems}
                itemsPerPage={rankingData.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? currentPage : undefined}
                generatePageUrl={page => buildPageUrl(currentCountry, page)}
                onPageChange={setCurrentPage}
              />

              <div className="flex flex-col gap-2">
                {rankingData.items.map(player => (
                  <div key={player.id} className="grid grid-cols-[1fr_25px] gap-3">
                    <div className="grow">
                      <ScoreSaberPlayerRanking
                        player={player}
                        firstColumnWidth={firstColumnWidth}
                        mainPlayer={mainPlayer}
                        relativePerformancePoints={showRelativePPDifference}
                      />
                    </div>

                    <div className="flex h-full w-full items-center justify-center">
                      <AddFriend player={player} className="bg-ssr rounded-full p-1.5" iconOnly />
                    </div>
                  </div>
                ))}
              </div>

              <SimplePagination
                page={currentPage}
                totalItems={rankingData.metadata.totalItems}
                itemsPerPage={rankingData.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? currentPage : undefined}
                generatePageUrl={page => buildPageUrl(currentCountry, page)}
                onPageChange={setCurrentPage}
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
              <CountrySelector
                className="h-10 w-full"
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
