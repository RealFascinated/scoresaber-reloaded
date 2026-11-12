"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import CountrySelector from "@/components/country-selector";
import { PageTitle } from "@/components/page-title";
import { getRankChars, PlayerRankCard } from "@/components/ranking/player-rank-card";
import { PlayerTableSkeleton } from "@/components/ranking/player-table-skeleton";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import useMe from "@/hooks/use-me";
import { SharedIcons } from "@/shared-icons";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import Card from "../card";
import FollowButton from "../following/follow-button";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import MedalsInfo from "./medals-info";
import {
  buildMedalsQuery,
  isSameMedalsQuery,
  medalsSearchParams,
  type MedalsInitialData,
} from "./medals-query";
import { MedalsRanking } from "./medals-ranking";

type MedalsDataProps = {
  /** Medal rankings rendered on the server, used until the client has data of its own. */
  initial?: MedalsInitialData;
};

export default function MedalsData({ initial }: MedalsDataProps) {
  const [currentPage, setCurrentPage] = useQueryState("page", medalsSearchParams.page);
  const [countryQuery, setCountryQuery] = useQueryState("country", medalsSearchParams.country);
  const currentCountry = countryQuery?.toUpperCase() ?? undefined;
  const setCurrentCountry = (value: string | undefined) =>
    setCountryQuery(value ? value.toUpperCase() : null);
  const query = buildMedalsQuery(currentPage, countryQuery);
  // The follow column only exists for a signed-in user, so signed-out tables don't reserve its space
  const { data: me } = useMe();

  // The server data is only valid for the query it was fetched for
  const initialData = initial && isSameMedalsQuery(initial.query, query) ? initial.data : undefined;

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["medalRankingData", currentPage, currentCountry],
    queryFn: async () => ssrApi.getMedalRankedPlayers(currentPage, currentCountry),
    initialData,
    initialDataUpdatedAt: initial?.fetchedAt,
    // Fail fast so a backend outage surfaces as an error state instead of an
    // endless retry spinner (the provider default is infinite retries).
    retry: false,
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  const showBackendUnavailable = !rankingData && isError && isBackendUnavailableError(error);
  const rankChars = getRankChars(rankingData?.items.map(player => player.medalsRank) ?? []);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Medals" description="Track medal rankings and compare players by medal count" />

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
        {currentCountry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentCountry(undefined);
              setCurrentPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 xl:flex-row xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {showBackendUnavailable && <BackendUnavailable onRetry={() => refetch()} />}

          {!rankingData && !isError && !showBackendUnavailable && <PlayerTableSkeleton />}

          {isError && !showBackendUnavailable && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
              <p className="text-lg">No players were found for this country or page.</p>
              <SimpleLink href="/medals">
                <Button variant="outline" className="gap-2">
                  Go to Page 1
                  <SharedIcons.RankingPageLinkIcon className="size-4" />
                </Button>
              </SimpleLink>
            </div>
          )}

          {rankingData && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:hidden">
                {rankingData.items.length === 0 && (
                  <p className="text-muted-foreground py-10 text-center">No players found</p>
                )}
                {rankingData.items.map((player, index) => (
                  <PlayerRankCard
                    key={player.id}
                    player={player}
                    rank={player.medalsRank}
                    rankChars={rankChars}
                    countryRank={player.medalsCountryRank}
                    value={formatNumberWithCommas(player.medals)}
                    valueClassName="text-medals"
                    valueIcon={<SharedIcons.MedalsIcon className="size-4" />}
                    deferAvatar={index >= 8}
                    showFollow={!!me}
                  />
                ))}
              </div>

              <div className="ring-border bg-card overflow-hidden rounded-xl ring-1 max-sm:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead className="w-20">Country</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="w-24 text-right">Medals</TableHead>
                      {me && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingData.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={me ? 5 : 4} className="text-muted-foreground py-10 text-center">
                          No players found
                        </TableCell>
                      </TableRow>
                    )}
                    {rankingData.items.map((player, index) => (
                      <TableRow key={player.id} className="relative cursor-pointer">
                        <TableCell className="py-2">
                          <span className="text-sm font-semibold tabular-nums">#{player.medalsRank}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={player.country ?? ""} size={14} />
                            <span className="text-foreground text-sm tabular-nums">
                              #{player.medalsCountryRank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <MedalsRanking player={player} deferAvatar={index >= 8} />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="text-medals inline-flex items-center gap-1 font-semibold tabular-nums">
                            <SharedIcons.MedalsIcon className="size-4" />
                            {formatNumberWithCommas(player.medals)}
                          </span>
                        </TableCell>
                        {me && (
                          <TableCell className="relative z-10 py-2">
                            <FollowButton player={player} iconOnly />
                          </TableCell>
                        )}
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

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-80">
          <Card>
            <MedalsInfo />
          </Card>
        </div>
      </div>
    </div>
  );
}

function buildPageUrl(country: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (country) {
    params.set("country", country);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/medals?${query}` : "/medals";
}
