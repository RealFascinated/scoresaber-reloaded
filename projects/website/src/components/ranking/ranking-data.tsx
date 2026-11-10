"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import { DEBOUNCE_MS_SEARCH } from "@/common/debounce";
import { cn } from "@/common/utils";
import BackendUnavailable from "@/components/api/backend-unavailable";
import CountrySelector from "@/components/country-selector";
import { PageTitle } from "@/components/page-title";
import { useRealm } from "@/components/providers/realm-provider";
import { PlayerTableSkeleton } from "@/components/ranking/player-table-skeleton";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { Switch } from "@/components/ui/switch";
import { useMainPlayer } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useQueryState } from "nuqs";
import FollowButton from "../following/follow-button";
import { PlayerAvatar } from "../ranking/player-avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import {
  buildRankingQuery,
  isSameRankingQuery,
  rankingSearchParams,
  type RankingInitialData,
} from "./ranking-query";

type RankingDataProps = {
  /** Ranking data rendered on the server, used until the client has data of its own. */
  initial?: RankingInitialData;
};

export default function RankingData({ initial }: RankingDataProps) {
  const { realmId } = useRealm();
  const isDefaultRealm = realmId === DEFAULT_REALM_ID;
  const mainPlayer = useMainPlayer().data;

  const [currentPage, setCurrentPage] = useQueryState("page", rankingSearchParams.page);
  const [countryQuery, setCountryQuery] = useQueryState("country", rankingSearchParams.country);
  const currentCountry = countryQuery?.toUpperCase() ?? undefined;
  const setCurrentCountry = (value: string | undefined) =>
    setCountryQuery(value ? value.toUpperCase() : null);
  const [currentSearch, setCurrentSearch] = useQueryState("search", rankingSearchParams.search);
  const [includeInactives, setIncludeInactives] = useQueryState("inactive", rankingSearchParams.inactive);
  const [showRelativePp, setShowRelativePp] = useQueryState("relativePp", rankingSearchParams.relativePp);
  const debouncedSearch = useDebounce(currentSearch, DEBOUNCE_MS_SEARCH);
  const query = buildRankingQuery(currentPage, countryQuery, debouncedSearch, includeInactives);

  // The server only renders the default realm, and its data is only valid for the query it was fetched for
  const initialData =
    initial && isDefaultRealm && isSameRankingQuery(initial.query, query) ? initial.data : undefined;

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["rankingData", realmId, query.page, query.country, query.search, query.includeInactives],
    queryFn: async () =>
      ssrApi.searchPlayersRanking(query.page, {
        country: query.country,
        search: query.search,
        includeInactives: query.includeInactives,
        realmId,
      }),
    initialData,
    initialDataUpdatedAt: initial?.fetchedAt,
    // Fail fast so a backend outage surfaces as an error state instead of an
    // endless retry spinner (the provider default is infinite retries).
    retry: false,
    refetchIntervalInBackground: false,
    // Don't carry the server's default realm data over to a realm it wasn't rendered for
    placeholderData: (previous, previousQuery) =>
      previousQuery?.options.initialData !== undefined && !isDefaultRealm ? undefined : previous,
  });

  const showBackendUnavailable = !rankingData && isError && isBackendUnavailableError(error);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle
        title="Ranking"
        description="View players ranked by performance points globally or by country"
      />

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CountrySelector
            className="h-9 w-full sm:w-56"
            value={currentCountry}
            onValueChange={(newCountry: string | undefined) => {
              setCurrentCountry(newCountry);
              setCurrentPage(1);
            }}
            placeholder="All countries"
          />
          <div className="relative w-full sm:w-64">
            <SharedIcons.SearchFieldIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search players..."
              value={currentSearch ?? ""}
              onChange={e => {
                setCurrentSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-8"
            />
          </div>
          {(currentCountry || currentSearch) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentCountry(undefined);
                setCurrentSearch("");
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          )}

          <div className="flex items-center gap-4 sm:ml-auto">
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={includeInactives}
                onCheckedChange={value => {
                  setIncludeInactives(value);
                  setCurrentPage(1);
                }}
              />
              Include inactive
            </label>
            <label
              className={cn(
                "text-muted-foreground flex items-center gap-2 text-sm",
                mainPlayer == undefined ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            >
              <Switch
                checked={showRelativePp}
                onCheckedChange={value => {
                  setShowRelativePp(value);
                  setCurrentPage(1);
                }}
                disabled={mainPlayer == undefined}
              />
              Relative PP
            </label>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {showBackendUnavailable && <BackendUnavailable onRetry={() => refetch()} />}

          {!rankingData && !isError && !showBackendUnavailable && <PlayerTableSkeleton />}

          {isError && !showBackendUnavailable && (
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
              <div className="ring-border bg-card overflow-x-auto rounded-xl ring-1">
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
                    {rankingData.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                          No players found
                        </TableCell>
                      </TableRow>
                    )}
                    {rankingData.items.map((player, index) => (
                      <TableRow
                        key={player.id}
                        className={cn(
                          mainPlayer?.id === player.id ? "bg-primary/5" : "",
                          player.inactive && "bg-inactive-account/10",
                          "relative cursor-pointer"
                        )}
                      >
                        <TableCell className="py-2">
                          <span className="text-sm font-semibold tabular-nums">#{player.rank}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={player.country} size={14} />
                            <span className="text-foreground text-sm tabular-nums">
                              #{player.countryRank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <PlayerTableName
                            player={player}
                            inactive={player.inactive}
                            deferAvatar={index >= EAGER_AVATAR_ROWS}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right whitespace-nowrap">
                          <span className="text-pp font-semibold tabular-nums">{formatPp(player.pp)}pp</span>
                          {showRelativePp && mainPlayer && (
                            <PlayerPpDifference pp={player.pp} mainPp={mainPlayer.pp} />
                          )}
                        </TableCell>
                        <TableCell className="relative z-10 py-2">
                          <FollowButton player={player} iconOnly />
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

// Rows that fit above the fold on a phone keep their avatar in the first paint; the rest wait for hydration
const EAGER_AVATAR_ROWS = 8;

function PlayerTableName({
  player,
  inactive,
  deferAvatar,
}: {
  player: { name: string; avatar: string; id: string };
  inactive: boolean;
  deferAvatar: boolean;
}) {
  return (
    <SimpleLink
      href={`/player/${player.id}`}
      className="flex items-center gap-2.5 after:absolute after:inset-0"
    >
      <PlayerAvatar
        profilePicture={player.avatar}
        name={player.name}
        className={inactive ? "grayscale" : ""}
        deferred={deferAvatar}
      />
      <span className={cn("text-sm font-medium whitespace-nowrap", inactive && "text-muted-foreground")}>
        {player.name}
      </span>
    </SimpleLink>
  );
}

function PlayerPpDifference({ pp, mainPp }: { pp: number; mainPp: number }) {
  const difference = pp - mainPp;
  const colorClass =
    difference > 0 ? "text-success" : difference < 0 ? "text-danger" : "text-muted-foreground";

  return (
    <span className={cn("ml-1 font-semibold", colorClass)}>
      ({difference > 0 ? "+" : ""}
      {formatPp(difference)})
    </span>
  );
}
