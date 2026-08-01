"use client";

import { DEBOUNCE_MS_SEARCH } from "@/common/debounce";
import { cn } from "@/common/utils";
import CountrySelector from "@/components/country-selector";
import { PageTitle } from "@/components/page-title";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { PlayerAvatar } from "../ranking/player-avatar";
import { Button } from "../ui/button";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export default function RankingData() {
  const router = useRouter();
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  const [currentPage, setCurrentPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [countryQuery, setCountryQuery] = useQueryState("country", parseAsString);
  const currentCountry = countryQuery?.toUpperCase() ?? undefined;
  const setCurrentCountry = (value: string | undefined) =>
    setCountryQuery(value ? value.toUpperCase() : null);
  const [currentSearch, setCurrentSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [includeInactives, setIncludeInactives] = useQueryState(
    "inactive",
    parseAsBoolean.withDefault(false)
  );
  const [showRelativePp, setShowRelativePp] = useQueryState("relativePp", parseAsBoolean.withDefault(false));
  const debouncedSearch = useDebounce(currentSearch, DEBOUNCE_MS_SEARCH);
  const isValidSearch = debouncedSearch.length >= 3;

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: [
      "rankingData",
      currentPage,
      currentCountry,
      isValidSearch ? debouncedSearch : undefined,
      includeInactives,
    ],
    queryFn: async () =>
      ssrApi.searchPlayersRanking(currentPage, {
        country: currentCountry,
        search: isValidSearch ? debouncedSearch : undefined,
        includeInactives: includeInactives,
      }),
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle
        title="Ranking"
        description="View players ranked by performance points globally or by country"
      />

      <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
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
              <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead className="w-20">Country</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className={cn("text-right", showRelativePp && mainPlayer ? "w-44" : "w-24")}>
                        PP
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingData.items.map(player => (
                      <TableRow
                        key={player.id}
                        className={cn(
                          mainPlayer?.id === player.id ? "bg-primary/5" : "",
                          player.inactive && "bg-inactive-account/10",
                          "cursor-pointer"
                        )}
                        onClick={() => router.push(`/player/${player.id}`)}
                      >
                        <TableCell className="py-2">
                          <span className="font-mono text-sm font-semibold">#{player.rank}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={player.country} size={14} />
                            <span className="text-foreground font-mono text-sm">#{player.countryRank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <PlayerTableName player={player} inactive={player.inactive} />
                        </TableCell>
                        <TableCell className="py-2 text-right whitespace-nowrap">
                          <span className="text-primary font-semibold">{formatPp(player.pp)}</span>
                          {showRelativePp && mainPlayer && (
                            <PlayerPpDifference pp={player.pp} mainPp={mainPlayer.pp} />
                          )}
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
                generatePageUrl={page =>
                  buildPageUrl(page, {
                    country: currentCountry,
                    search: currentSearch,
                    includeInactives,
                    showRelativePp,
                  })
                }
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        <div className="w-full shrink-0 md:w-96">
          <FilterSection
            title="Filters"
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

            <FilterRow className="justify-between">
              <span className="text-foreground text-sm font-medium">Include Inactives</span>
              <Switch checked={includeInactives} onCheckedChange={setIncludeInactives} />
            </FilterRow>

            <FilterRow className="justify-between">
              <span className="text-foreground text-sm font-medium">Relative PP</span>
              <Switch
                checked={showRelativePp}
                onCheckedChange={setShowRelativePp}
                disabled={mainPlayer == undefined}
              />
            </FilterRow>
          </FilterSection>
        </div>
      </div>
    </div>
  );
}

function buildPageUrl(
  page: number,
  filters: {
    country?: string;
    search: string;
    includeInactives: boolean;
    showRelativePp: boolean;
  }
): string {
  const params = new URLSearchParams();
  if (filters.country) {
    params.set("country", filters.country);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.includeInactives) {
    params.set("inactive", "true");
  }
  if (filters.showRelativePp) {
    params.set("relativePp", "true");
  }
  const query = params.toString();
  return query ? `/ranking?${query}` : "/ranking";
}

function PlayerTableName({
  player,
  inactive,
}: {
  player: { name: string; avatar: string; id: string };
  inactive: boolean;
}) {
  return (
    <SimpleLink href={`/player/${player.id}`} className="flex items-center gap-2.5">
      <PlayerAvatar
        profilePicture={player.avatar}
        name={player.name}
        className={inactive ? "grayscale" : ""}
      />
      <span className={cn("text-sm font-medium", inactive && "text-muted-foreground")}>{player.name}</span>
    </SimpleLink>
  );
}

function PlayerPpDifference({ pp, mainPp }: { pp: number; mainPp: number }) {
  const difference = pp - mainPp;
  const colorClass =
    difference > 0 ? "text-green-400" : difference < 0 ? "text-red-400" : "text-muted-foreground";

  return (
    <span className={cn("ml-1 font-semibold", colorClass)}>
      ({difference > 0 ? "+" : ""}
      {formatPp(difference)})
    </span>
  );
}
