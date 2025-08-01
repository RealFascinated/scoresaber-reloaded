"use client";

import { getMedalRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import { useIsMobile } from "@/contexts/viewport-context";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { LinkIcon, XIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleLink from "../simple-link";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import CountryFlag from "../ui/country-flag";
import { Separator } from "../ui/separator";
import MedalsInfo from "./medals-info";
import { PlayerMedalRanking } from "./player-medal-ranking";

// Constants
const DEFAULT_PAGE = 1;

export default function RankingData() {
  const isMobile = useIsMobile();

  // State
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(DEFAULT_PAGE)
  );
  const [currentCountry, setCurrentCountry] = useQueryState(
    "country",
    parseAsString.withDefault("")
  );

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

  const getUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams();

      if (page !== DEFAULT_PAGE) params.set("page", page.toString());
      if (currentCountry) params.set("country", currentCountry);

      const queryString = params.toString();
      return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    },
    [currentCountry]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
    },
    [setCurrentPage]
  );

  const firstColumnWidth = getMedalRankingColumnWidth(rankingData?.items ?? []);

  return (
    <div className="flex w-full flex-col justify-center gap-2 xl:flex-row xl:gap-2">
      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card className="flex flex-col gap-2">
          <p className="text-lg font-semibold">Medal Ranking</p>
          <Separator />
          <div className="flex w-full justify-between">
            <p className="text-muted-foreground text-sm">
              Medals are earned by being one of the best on a Ranked Leaderboard!
            </p>
          </div>
        </Card>

        <Card className="h-full w-full gap-4">
          {!rankingData && !isError && (
            <FancyLoader
              title="Loading Players"
              description="Please wait while we fetch the players..."
            />
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
                generatePageUrl={getUrl}
                onPageChange={handlePageChange}
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
                generatePageUrl={getUrl}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="flex w-full flex-col gap-2 xl:w-[25%]">
        <Card className="h-fit w-full gap-2">
          <span className="text-lg font-semibold">Filters</span>
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center gap-2">
              <div className="flex w-full flex-col">
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
                    setCurrentCountry(newCountry || "");
                    setCurrentPage(1);
                  }}
                  placeholder="Select country..."
                />
              </div>

              {currentCountry && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => setCurrentCountry("")}
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <MedalsInfo />
        </Card>
      </div>
    </div>
  );
}
