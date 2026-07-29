"use client";

import CountrySelector from "@/components/country-selector";
import { PageTitle } from "@/components/page-title";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import CountryFlag from "@/components/ui/country-flag";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { SharedIcons } from "@/shared-icons";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Card from "../card";
import { FancyLoader } from "../fancy-loader";
import AddFriend from "../friend/add-friend";
import { Button } from "../ui/button";
import { FilterField, FilterRow, FilterSection } from "../ui/filter-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import MedalsInfo from "./medals-info";
import { MedalsRanking } from "./medals-ranking";

type RankingDataProps = {
  initialPage: number;
  initialCountry?: string;
};

export default function RankingData({ initialPage, initialCountry }: RankingDataProps) {
  const navigation = usePageNavigation();
  const router = useRouter();

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

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Medals" description="Track medal rankings and compare players by medal count" />

      <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {!rankingData && !isError && (
            <FancyLoader title="Loading Players" description="Please wait while we fetch the players..." />
          )}

          {isError && (
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

        <div className="flex w-full shrink-0 flex-col gap-4 md:w-96">
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
  return `/medals/${country != undefined ? `${country}/` : ""}${page}`;
}
