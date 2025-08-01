"use client";

import { getPlayerRankingColumnWidth } from "@/common/player-utils";
import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useLiveQuery } from "dexie-react-hooks";
import { LinkIcon, XIcon } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleLink from "../simple-link";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import Combobox from "../ui/combo-box";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { PlayerRanking } from "./player-ranking";

// Constants
const DEFAULT_PAGE = 1;

export default function RankingData() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(DEFAULT_PAGE)
  );
  const [currentCountry, setCurrentCountry] = useQueryState(
    "country",
    parseAsString.withDefault("")
  );
  const [currentSearch, setCurrentSearch] = useQueryState("search", parseAsString.withDefault(""));

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
        country: currentCountry || undefined,
        search: isValidSearch ? debouncedSearch : undefined,
      }),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  const getUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams();

      if (page !== DEFAULT_PAGE) params.set("page", page.toString());
      if (currentCountry) params.set("country", currentCountry);
      if (currentSearch) params.set("search", currentSearch);

      const queryString = params.toString();
      return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    },
    [currentCountry, currentSearch]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
    },
    [setCurrentPage]
  );

  const firstColumnWidth = getPlayerRankingColumnWidth(rankingData?.items ?? []);

  return (
    <div className="flex w-full flex-col justify-center gap-2 xl:flex-row xl:gap-2">
      <div className="flex w-full flex-col gap-2 xl:w-[50%]">
        <Card>
          <div className="flex flex-col justify-between gap-2">
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex items-center font-medium">
                {currentCountry && (
                  <div className="flex items-center gap-2">
                    <CountryFlag code={currentCountry} size={18} />
                    <span className="text-lg font-semibold">
                      {countryFilter.find(c => c.key === currentCountry)?.friendlyName}
                    </span>
                  </div>
                )}
                {!currentCountry && (
                  <div className="flex items-center gap-2">
                    <GlobeAmericasIcon className="size-6" />
                    <p className="text-lg font-semibold">Global Players</p>
                  </div>
                )}
              </div>

              {mainPlayer !== undefined && (
                <div className="bg-accent/50 flex min-w-fit items-center gap-3 rounded-md px-4 py-2">
                  <SimpleTooltip
                    display="The amount of pp between you and each player"
                    showOnMobile
                  >
                    <p className="text-sm">Relative PP</p>
                  </SimpleTooltip>
                  <Switch
                    checked={showRelativePPDifference}
                    onCheckedChange={checked => setShowRelativePPDifference(checked)}
                  />
                </div>
              )}
            </div>

            <Separator />

            <span className="text-muted-foreground text-sm">
              Challenge yourself to become the best player in the world!
            </span>
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
                generatePageUrl={getUrl}
                onPageChange={handlePageChange}
                showStats={false}
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
                    setCurrentCountry(newCountry ?? "");
                    setCurrentPage(DEFAULT_PAGE);
                  }}
                  placeholder="Select country..."
                />
              </div>

              {currentCountry && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => {
                    setCurrentCountry("");
                    setCurrentPage(DEFAULT_PAGE);
                  }}
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
              onChange={e => {
                setCurrentSearch(e.target.value);
                setCurrentPage(DEFAULT_PAGE);
              }}
              className="h-10"
            />
            {currentSearch && currentSearch.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={() => {
                  setCurrentSearch("");
                  setCurrentPage(DEFAULT_PAGE);
                }}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
