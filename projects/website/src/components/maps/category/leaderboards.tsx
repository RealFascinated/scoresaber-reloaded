"use client";

import Card from "@/components/card";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { ChartBarIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";

export default function Leaderboards() {
  const isMobile = useIsMobile();

  const filter = useMapFilter();
  const filterDebounced = useDebounce(filter, 100);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const {
    data: leaderboardResponse,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["maps", filterDebounced, page],
    queryFn: async () =>
      ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .lookupLeaderboards(page, {
          category: filterDebounced.category,
          sort: filterDebounced.sort,
          stars: {
            min: filterDebounced.starMin,
            max: filterDebounced.starMax,
          },
          ranked: filterDebounced.ranked,
          qualified: filterDebounced.qualified,
          verified: filterDebounced.verified,
          search: filterDebounced.search.length > 3 ? filterDebounced.search : undefined,
        }),
    placeholderData: data => data,
  });

  const leaderboards = leaderboardResponse?.leaderboards;
  return (
    <Card>
      {isLoading && leaderboardResponse == undefined && (
        <div className="flex w-full justify-center">
          <Spinner />
        </div>
      )}

      <div>
        {leaderboards?.length === 0 && (
          <div className="mb-2">
            <EmptyState
              title="No Leaderboards Found"
              description="No leaderboards were found on this page"
              icon={<ChartBarIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />}
            />
          </div>
        )}

        {leaderboards && leaderboards.length > 0 && (
          <div className="flex flex-col gap-1 pb-2">
            <div className="flex flex-col gap-1.5 border-none">
              {leaderboards.map((leaderboardToken, index) => {
                const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);
                let date: Date | undefined = leaderboard.timestamp;
                if (leaderboard.ranked) {
                  date = leaderboard.dateRanked;
                } else if (leaderboard.qualified) {
                  date = leaderboard.dateQualified;
                }

                return (
                  <div key={index}>
                    <SimpleLink
                      href={`/leaderboard/${leaderboard.id}`}
                      className="bg-accent-deep hover:bg-accent-deep/50 grid items-center gap-2 rounded-md p-1.5 transition-all lg:grid-cols-[1fr_0.19fr]"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ScoreSaberScoreSongInfo
                          leaderboard={leaderboard}
                          imageSize={58}
                          clickableSongName={false}
                        />
                      </div>
                      <div className="flex flex-row-reverse items-center justify-between text-sm lg:flex-col lg:justify-end lg:gap-1">
                        {/* Plays */}
                        <SimpleTooltip display="The total number of plays on this leaderboard">
                          <p>{formatNumberWithCommas(leaderboard.plays)} Plays</p>
                        </SimpleTooltip>

                        {date && (
                          <SimpleTooltip
                            display={
                              <p>
                                {leaderboard.status == "Unranked" ? "Created" : leaderboard.status}{" "}
                                {timeAgo(date)} ({formatDate(date, "Do MMMM, YYYY HH:mm a")})
                              </p>
                            }
                          >
                            <p className="text-gray-400">{timeAgo(date)}</p>
                          </SimpleTooltip>
                        )}
                      </div>
                    </SimpleLink>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leaderboardResponse && (
          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={leaderboardResponse.metadata.total}
            itemsPerPage={leaderboardResponse.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
            statsBelow={!isMobile}
          />
        )}
      </div>
    </Card>
  );
}
