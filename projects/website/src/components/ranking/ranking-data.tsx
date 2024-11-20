"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useIsMobile } from "@/hooks/use-is-mobile";
import Pagination from "@/components/input/pagination";
import { PlayerRanking } from "@/components/ranking/player-ranking";
import { ScoreSaberPlayersPageToken } from "@ssr/common/types/token/scoresaber/players-page";
import CountryFlag from "@/components/country-flag";
import { normalizedRegionName } from "@ssr/common/utils/region-utils";
import Card from "@/components/card";
import { Switch } from "@/components/ui/switch";

type RankingDataProps = {
  initialPage: number;
  country?: string | undefined;
  initialPageData?: ScoreSaberPlayersPageToken;
};

export default function RankingData({ initialPage, country, initialPageData }: RankingDataProps) {
  const isMobile = useIsMobile();

  const [showRelativePPDifference, setShowRelativePPDifference] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [rankingData, setRankingData] = useState<ScoreSaberPlayersPageToken | undefined>(initialPageData);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rankingData", currentPage, country],
    queryFn: async () => {
      const players =
        country == undefined
          ? await scoresaberService.lookupPlayers(currentPage)
          : await scoresaberService.lookupPlayersByCountry(currentPage, country);
      return players && players.players.length > 0 ? players : undefined;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (data && (!isLoading || !isError)) {
      setRankingData(data);
    }
  }, [data, isLoading, isError]);

  const getUrl = useCallback(
    (page: number) => {
      return `/ranking/${country != undefined ? `${country}/` : ""}${page}`;
    },
    [country]
  );

  useEffect(() => {
    const newUrl = getUrl(currentPage);
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  }, [currentPage, getUrl]);

  if (!rankingData) {
    return <p>Unknown page.</p>;
  }

  const { players, metadata } = rankingData;

  return (
    <Card className="h-full w-full xl:max-w-[85%] gap-2">
      <div className="flex items-center justify-between gap-2 flex-col lg:flex-row">
        <div className="flex items-center gap-2 font-semibold">
          {country && <CountryFlag code={country} size={16} />}
          <p>
            You are viewing {country ? "players from " + normalizedRegionName(country.toUpperCase()) : "Global players"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p>Toggle relative pp difference</p>
          <Switch
            checked={showRelativePPDifference}
            onCheckedChange={checked => {
              setShowRelativePPDifference(checked);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {/* Wrapping the table in a scrollable container */}
        <div className="overflow-x-auto">
          <table className="table w-full table-auto border-spacing-2 border-none text-left">
            <thead>
              <tr>
                <th className="px-2 py-1">Rank</th>
                <th className="px-2 py-1">Player</th>
                <th className="px-2 py-1 text-center">Performance Points</th>
                <th className="px-2 py-1 text-center">Total Plays</th>
                <th className="px-2 py-1 text-center">Total Ranked Plays</th>
                <th className="px-2 py-1 text-center">Avg Ranked Accuracy</th>
                <th className="px-2 py-1 text-center">Weekly Change</th>
              </tr>
            </thead>
            <tbody className="border-none">
              {players.map(player => (
                <tr key={player.rank} className="border-b border-border">
                  <PlayerRanking
                    isCountry={country != undefined}
                    player={player}
                    relativePerformancePoints={showRelativePPDifference}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          mobilePagination={isMobile}
          page={currentPage}
          totalItems={metadata.total}
          itemsPerPage={metadata.itemsPerPage}
          loadingPage={isLoading ? currentPage : undefined}
          generatePageUrl={page => {
            return getUrl(page);
          }}
          onPageChange={newPage => {
            setCurrentPage(newPage);
          }}
        />
      </div>
    </Card>
  );
}
