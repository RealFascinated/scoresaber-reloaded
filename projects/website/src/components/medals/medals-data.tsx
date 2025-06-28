"use client";

import { getMedalRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaInfo } from "react-icons/fa";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import CountryFlag from "../ui/country-flag";
import { Separator } from "../ui/separator";
import MedalsInfo from "./medals-info";
import { PlayerMedalRanking } from "./player-medal-ranking";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

type RankingFiltersProps = {
  currentCountry: string | undefined;
  countryMetadata: Record<string, number>;
  setCurrentCountry: (country: string | undefined) => void;
  setCurrentPage: (page: number) => void;
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

  const firstColumnWidth = useMemo(() => {
    return getMedalRankingColumnWidth(rankingData?.items ?? []);
  }, [rankingData]);

  return (
    <div className="flex w-full flex-col justify-center xl:flex-row xl:gap-2">
      <RankingFilters
        currentCountry={currentCountry}
        setCurrentCountry={setCurrentCountry}
        setCurrentPage={setCurrentPage}
        countryMetadata={rankingData?.countryMetadata ?? {}}
      />

      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card className="flex flex-col gap-2">
          <p className="text-lg">Medal Ranking</p>
          <Separator />
          <div className="flex w-full justify-between">
            <p className="text-muted-foreground text-sm">
              Medals are earned by being one of the best on a Ranked Leaderboard!
            </p>
            <SimpleTooltip display={<MedalsInfo />} side="bottom" showOnMobile>
              <div className="bg-accent flex items-center gap-1 rounded-md p-0.5">
                <FaInfo className="text-muted-foreground size-4" />
                Information
              </div>
            </SimpleTooltip>
          </div>
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
              <Link href="/medals">
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
                generatePageUrl={page => buildPageUrl(currentCountry, page)}
                onPageChange={setCurrentPage}
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
      </div>
    </Card>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
  return `/medals/${country != undefined ? `${country}/` : ""}${page}`;
}
