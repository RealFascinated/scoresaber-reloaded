"use client";

import Card from "@/components/card";
import ScoreSaberScoreSongInfo from "@/components/platform/scoresaber/score/score-song-info";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import SimplePagination from "@/components/simple-pagination";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { ChartBarIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type LeaderboardsProps = {
  /**
   * The selected page.
   */
  initialPage?: number;
};

export default function Leaderboards({ initialPage }: LeaderboardsProps) {
  const isMobile = useIsMobile();
  const pageNavigation = usePageNavigation();

  const filter = useMapFilter();
  const filterDebounced = useDebounce(filter, 100);
  const [page, setPage] = useState(initialPage || 1);

  const { data: leaderboardResponse, isLoading } = useQuery({
    queryKey: ["maps", filterDebounced, page],
    queryFn: async () =>
      ApiServiceRegistry.getInstance().getScoreSaberService().lookupLeaderboards(page, {
        category: filterDebounced.category,
        sort: filterDebounced.sort,
        stars: filterDebounced.stars,
        ranked: filterDebounced.ranked,
        qualified: filterDebounced.qualified,
        verified: filterDebounced.verified,
      }),
    placeholderData: data => data,
  });

  /**
   * Reset the page when the filter changes
   */
  useEffect(() => {
    if (!initialPage) {
      setPage(1);
    }
  }, [filter, initialPage]);

  /**
   * Update the page url when the page changes
   */
  useEffect(() => {
    pageNavigation.changePageUrl(`/maps?category=leaderboards&page=${page}`);
  }, [page, pageNavigation]);

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
                    <Link
                      href={`/leaderboard/${leaderboard.id}`}
                      className="bg-border grid items-center gap-2 rounded-md p-1.5 transition-all hover:brightness-75 lg:grid-cols-[1fr_0.17fr]"
                    >
                      <ScoreSaberScoreSongInfo
                        leaderboard={leaderboard}
                        imageSize={58}
                        clickableSongName={false}
                      />
                      <div className="flex justify-between text-sm lg:flex-col lg:justify-end lg:gap-1">
                        {date && (
                          <SimpleTooltip
                            display={
                              <p>
                                {leaderboard.status == "Unranked" ? "Created" : leaderboard.status}{" "}
                                {timeAgo(date)} ({formatDate(date, "Do MMMM, YYYY HH:mm a")})
                              </p>
                            }
                          >
                            {timeAgo(date)}
                          </SimpleTooltip>
                        )}
                      </div>
                    </Link>
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
            loadingPage={isLoading ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
            statsBelow={!isMobile}
          />
        )}
      </div>
    </Card>
  );
}
