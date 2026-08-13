"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import CountrySelector from "@/components/country-selector";
import { PageTitle } from "@/components/page-title";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { SharedIcons } from "@/shared-icons";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import Card from "../card";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { Button } from "../ui/button";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import MedalsInfo from "./medals-info";
import { MedalsRanking } from "./medals-ranking";

export default function MedalsData() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [countryQuery, setCountryQuery] = useQueryState("country", parseAsString);
  const currentCountry = countryQuery?.toUpperCase() ?? undefined;
  const setCurrentCountry = (value: string | undefined) =>
    setCountryQuery(value ? value.toUpperCase() : null);

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
    // Fail fast so a backend outage surfaces as an error state instead of an
    // endless retry spinner (the provider default is infinite retries).
    retry: false,
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  const showBackendUnavailable = !rankingData && isError && isBackendUnavailableError(error);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Medals" description="Track medal rankings and compare players by medal count" />

      <div className="flex w-full flex-col gap-4 xl:flex-row xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {showBackendUnavailable && <BackendUnavailable onRetry={() => refetch()} />}

          {!rankingData && !isError && !showBackendUnavailable && (
            <FancyLoader title="Loading Players" description="Please wait while we fetch the players..." />
          )}

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
              <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead className="w-20">Country</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="w-24 text-right">Medals</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingData.items.map(player => (
                      <TableRow
                        key={player.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/player/${player.id}`)}
                      >
                        <TableCell className="py-2">
                          <span className="font-mono text-sm font-semibold">#{player.medalsRank}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <CountryFlag code={player.country ?? ""} size={14} />
                            <span className="text-foreground font-mono text-sm">
                              #{player.medalsCountryRank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <MedalsRanking player={player} />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="text-primary font-semibold">
                            {formatNumberWithCommas(player.medals)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <AddFriend player={player} iconOnly />
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

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-96">
          <FilterSection
            title="Filters"
            hasActiveFilters={Boolean(currentCountry)}
            onClear={() => {
              setCurrentCountry(undefined);
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
          </FilterSection>

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
