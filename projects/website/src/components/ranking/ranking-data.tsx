"use client";

import { DEBOUNCE_MS_SEARCH } from "@/common/debounce";
import SimpleLink from "@/components/simple-link";
import CountrySelector from "@/components/country-selector";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useRouter } from "next/navigation";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { cn } from "@/common/utils";
import { SharedIcons } from "@/shared-icons";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { countryFilter } from "@ssr/common/utils/country.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { PlayerAvatar } from "../ranking/player-avatar";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const navigation = usePageNavigation();
  const router = useRouter();
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentCountry, setCurrentCountry] = useState(initialCountry);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(undefined);
  const [includeInactives, setIncludeInactives] = useState<boolean>(false);
  const debouncedSearch = useDebounce(currentSearch, DEBOUNCE_MS_SEARCH);
  const isValidSearch = debouncedSearch != undefined && debouncedSearch.length >= 3;

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["rankingData", currentPage, currentCountry, isValidSearch, includeInactives],
    queryFn: async () =>
      ssrApi.searchPlayersRanking(currentPage, {
        country: currentCountry,
        search: isValidSearch ? debouncedSearch : undefined,
        includeInactives: includeInactives,
      }),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });
  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(currentCountry, currentPage));
  }, [currentPage, currentCountry, includeInactives, navigation]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentCountry ? (
            <CountryFlag code={currentCountry} size={20} />
          ) : (
            <SharedIcons.GlobalPlayersRankingIcon className="size-6 text-primary" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {currentCountry
              ? countryFilter.find(c => c.key === currentCountry)?.friendlyName
              : "Global Players"}
          </h1>
        </div>
        {mainPlayer !== undefined && (
          <div className="flex items-center gap-2">
            <SimpleTooltip display="The amount of pp between you and each player" showOnMobile>
              <span className="text-sm text-muted-foreground">Relative PP</span>
            </SimpleTooltip>
            <Switch
              checked={showRelativePPDifference}
              onCheckedChange={checked => setShowRelativePPDifference(checked)}
            />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">

          {!rankingData && !isError && (
            <FancyLoader title="Loading Players" description="Please wait while we fetch the players..." />
          )}

          {isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
              <p className="text-lg">No players were found for this country or page.</p>
              <SimpleLink href="/ranking">
                <Button variant="outline" className="gap-2">
                  Back to Global
                  <SharedIcons.RankingPageLinkIcon className="size-4" />
                </Button>
              </SimpleLink>
            </div>
          )}

          {rankingData && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl ring-1 ring-border overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead className="w-20">Country</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right w-24">PP</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingData.items.map(player => (
                      <TableRow
                        key={player.id}
                        className={cn(mainPlayer?.id === player.id ? "bg-primary/5" : "", "cursor-pointer")}
                        onClick={() => router.push(`/player/${player.id}`)}
                      >
                        <TableCell className="py-2">
                          <span className="font-mono text-sm font-semibold">#{player.rank}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={player.country} size={14} />
                            <span className="font-mono text-sm text-foreground">
                              #{player.countryRank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <PlayerTableName player={player} />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="font-semibold text-primary">
                            {formatPp(player.pp)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <AddFriend player={player} className="bg-ssr rounded-full p-1.5" iconOnly />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        </div>

        <div className="w-full lg:w-96 shrink-0">
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

            <FilterField label="Include Inactives">
              <FilterRow>
                <Switch checked={includeInactives} onCheckedChange={setIncludeInactives} />
              </FilterRow>
            </FilterField>
          </FilterSection>
        </div>
      </div>
    </div>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
  return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
}

function PlayerTableName({ player }: { player: { name: string; avatar: string; id: string } }) {
  return (
    <SimpleLink href={`/player/${player.id}`} className="flex items-center gap-2.5">
      <PlayerAvatar profilePicture={player.avatar} name={player.name} />
      <span className="text-sm font-medium">{player.name}</span>
    </SimpleLink>
  );
}
