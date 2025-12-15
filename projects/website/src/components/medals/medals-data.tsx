"use client";

import { getRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { useIsMobile } from "@/contexts/viewport-context";
import usePageNavigation from "@/hooks/use-page-navigation";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { countryFilter } from "@ssr/common/utils/country.util";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FaMedal } from "react-icons/fa";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { PlayerRanking } from "../player/player-ranking";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import CountryFlag from "../ui/country-flag";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import MedalsInfo from "./medals-info";
import { pluralize } from "@ssr/common/utils/string.util";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentCountry, setCurrentCountry] = useState(initialCountry);

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["medalRankingData", currentPage, currentCountry],
    queryFn: async () => ssrApi.getMedalRankedPlayers(currentPage, currentCountry),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentCountry, currentPage));
  }, [currentPage, currentCountry, navigation]);

  const firstColumnWidth = getRankingColumnWidth(
    rankingData?.items ?? [],
    player => (player as ScoreSaberPlayer).medals,
    player => (player as ScoreSaberPlayer).countryMedalsRank
  );

  return (
    <div className="flex w-full flex-col justify-center gap-2 xl:flex-row xl:gap-2">
      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card>
          <div className="flex items-center gap-(--spacing-sm)">
            <GlobeAmericasIcon className="size-6" />
            <h1 className="text-lg font-semibold">Medal Ranking</h1>
          </div>
        </Card>

        <Card className="h-fit w-full gap-4">
          {!rankingData && !isError && (
            <FancyLoader title="Loading Players" description="Please wait while we fetch the players..." />
          )}

          {isError && (
            <div className="mt-2 flex h-full flex-col items-center justify-center gap-3">
              <p className="text-lg">No players were found for this country or page.</p>
              <SimpleLink href="/medals">
                <Button variant="outline" className="gap-2">
                  Go to Page 1
                  <LinkIcon className="size-4" />
                </Button>
              </SimpleLink>
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
                        getRank={player => (player as ScoreSaberPlayer).medalsRank}
                        getCountryRank={player => (player as ScoreSaberPlayer).countryMedalsRank}
                        firstColumnWidth={firstColumnWidth}
                        showAccountInactive={false}
                        renderWorth={() => (
                          <div className="ml-auto flex min-w-[70px] flex-row items-center justify-end gap-2">
                            <FaMedal className="size-4" />
                            <p className="text-pp font-semibold">{formatNumberWithCommas(player.medals)}</p>
                          </div>
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
              />
            </div>
          )}
        </Card>
      </div>

      <div className="flex w-full flex-col gap-2 xl:w-[25%]">
        <FilterSection
          title="Filters"
          description="Filter players by country"
          hasActiveFilters={Boolean(currentCountry)}
          onClear={() => {
            setCurrentCountry(undefined);
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
                      <span className="truncate">{countryFilter.find(c => c.key === key)?.friendlyName ?? key}</span>
                      <span className="text-muted-foreground ml-4 text-sm whitespace-nowrap">
                        {count.toLocaleString()} {pluralize(count, "player")}
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
        </FilterSection>

        <Card>
          <MedalsInfo />
        </Card>
      </div>
    </div>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
  return `/medals/${country != undefined ? `${country}/` : ""}${page}`;
}
