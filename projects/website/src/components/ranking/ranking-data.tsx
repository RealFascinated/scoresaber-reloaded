"use client";

import { cn } from "@/common/utils";
import Card from "@/components/card";
import CountryFlag from "@/components/country-flag";
import { PlayerRanking } from "@/components/ranking/player-ranking";
import SimplePagination from "@/components/simple-pagination";
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FancyLoader } from "../fancy-loader";
import { Button } from "../ui/button";

type RankingDataProps = {
  initialPage: number;
  country?: string | undefined;
};

function buildPageUrl(country: string | undefined, page: number) {
  return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
}

export default function RankingData({ initialPage, country }: RankingDataProps) {
  const isMobile = useIsMobile();
  const navigation = usePageNavigation();
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const {
    data: rankingData,
    isLoading,
    isRefetching,
    isError,
  } = useQuery({
    queryKey: ["rankingData", currentPage, country],
    queryFn: async () => {
      const players =
        country == undefined
          ? await ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(currentPage)
          : await ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .lookupPlayersByCountry(currentPage, country);
      return players && players.players.length > 0 ? players : undefined;
    },
    refetchIntervalInBackground: false,
    placeholderData: prev => prev,
  });

  useEffect(() => {
    navigation.changePageUrl(buildPageUrl(country, currentPage));
  }, [currentPage, country]);

  return (
    <Card className="h-full w-full xl:max-w-[85%] gap-4">
      <div className="flex items-center justify-between gap-4 flex-col lg:flex-row bg-background/80 p-3 rounded-lg border border-border/50 shadow-sm">
        <div className="flex items-center gap-3 font-medium">
          {country && <CountryFlag code={country} size={20} />}
          <p className="text-lg">
            {country
              ? "Players from " + normalizedRegionName(country.toUpperCase())
              : "Global Players"}
          </p>
        </div>

        {/* Relative PP Difference */}
        {mainPlayer !== undefined && (
          <div className="flex items-center gap-3 bg-accent/50 px-4 py-2 rounded-md">
            <p className="text-sm">Show relative PP difference</p>
            <Switch
              checked={showRelativePPDifference}
              onCheckedChange={checked => {
                setShowRelativePPDifference(checked);
              }}
            />
          </div>
        )}
      </div>

      {!rankingData && !isError && (
        <FancyLoader
          title="Loading Players"
          description="Please wait while we fetch the players..."
        />
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center h-full mt-2 gap-3">
          <p className="text-lg">No players were found for this country or page.</p>
          <Link href="/ranking">
            <Button variant="outline" className="gap-2">
              Back to Global
              <LinkIcon className="size-4" />
            </Button>
          </Link>
        </div>
      )}

      {rankingData && (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto relative rounded-lg border border-border/30 bg-background/50">
            <table className="table w-full table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-background/80">
                  <th className="px-4 py-3 font-medium text-foreground/80">Rank</th>
                  <th className="px-4 py-3 font-medium text-foreground/80">Player</th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80">
                    Performance Points
                  </th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80">
                    Total Plays
                  </th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80">
                    Total Ranked Plays
                  </th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80">
                    Avg Ranked Accuracy
                  </th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80">
                    Weekly Change
                  </th>
                  <th className="px-4 py-3 font-medium text-center text-foreground/80"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/30">
                {rankingData.players.map((player, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "transition-colors hover:bg-primary/5",
                      mainPlayer?.id === player.id && "bg-primary/10"
                    )}
                  >
                    <PlayerRanking
                      isCountry={country != undefined}
                      player={player}
                      relativePerformancePoints={showRelativePPDifference}
                      mainPlayer={mainPlayer}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SimplePagination
            mobilePagination={isMobile}
            page={currentPage}
            totalItems={rankingData.metadata.total}
            itemsPerPage={rankingData.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? currentPage : undefined}
            generatePageUrl={page => buildPageUrl(country, page)}
            onPageChange={newPage => setCurrentPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
