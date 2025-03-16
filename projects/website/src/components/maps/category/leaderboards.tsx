"use client";

import Card from "@/components/card";
import SimplePagination from "@/components/simple-pagination";
import { LoadingIcon } from "@/components/loading-icon";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleTooltip from "@/components/simple-tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import usePageNavigation from "@/hooks/use-page-navigation";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
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

  const { data: leaderboards, isLoading } = useQuery({
    queryKey: ["maps", filterDebounced, page],
    queryFn: async () =>
      scoresaberService.lookupLeaderboards(page, {
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

  return (
    <Card>
      {isLoading && leaderboards == undefined && (
        <div className="flex w-full justify-center">
          <LoadingIcon />
        </div>
      )}

      {leaderboards !== undefined && (
        <div>
          <div className="flex flex-col gap-1 pb-2">
            <div className="border-none flex flex-col gap-1.5">
              {leaderboards.leaderboards.map((leaderboardToken, index) => {
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
                      prefetch={false}
                      href={`/leaderboard/${leaderboard.id}`}
                      className="grid lg:grid-cols-[1fr_0.17fr] gap-2 items-center bg-border p-1.5 hover:brightness-75 transition-all transform-gpu rounded-md"
                    >
                      <ScoreSongInfo
                        leaderboard={leaderboard}
                        imageSize={58}
                        clickableSongName={false}
                      />
                      <div className="text-sm flex justify-between lg:justify-end lg:flex-col lg:gap-1">
                        {date && (
                          <SimpleTooltip
                            display={
                              <p>
                                {leaderboard.status == "Unranked" ? "Created" : leaderboard.status}{" "}
                                {timeAgo(date)}
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

          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={leaderboards.metadata.total}
            itemsPerPage={leaderboards.metadata.itemsPerPage}
            loadingPage={isLoading ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
            statsBelow={!isMobile}
          />
        </div>
      )}
    </Card>
  );
}
