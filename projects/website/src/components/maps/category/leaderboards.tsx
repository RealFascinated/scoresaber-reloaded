"use client";

import Card from "@/components/card";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
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
      ssrApi.searchLeaderboards(page, {
        category: filterDebounced.category,
        sort: filterDebounced.sort,
        stars: {
          min: filterDebounced.starMin,
          max: filterDebounced.starMax,
        },
        ranked: filterDebounced.ranked,
        qualified: filterDebounced.qualified,
        verified: filterDebounced.verified,
        query: filterDebounced.search.length > 3 ? filterDebounced.search : undefined,
      }),
    placeholderData: data => data,
  });

  const leaderboards = leaderboardResponse?.items;
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
          <div className="pb-2">
            <div className="border-border bg-background/50 relative overflow-x-auto rounded-lg border">
              <table className="table w-full min-w-[760px] table-auto border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-foreground/90 px-3 py-2.5 font-semibold">Leaderboard</th>
                    <th className="text-foreground/90 px-3 py-2.5 text-center font-semibold">Stars</th>
                    <th className="text-foreground/90 px-3 py-2.5 text-center font-semibold">Plays</th>
                    <th className="text-foreground/90 min-w-[130px] px-3 py-2.5 text-center font-semibold">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboards.map(leaderboard => {
                    return (
                      <tr
                        key={leaderboard.id}
                        className="border-border/60 hover:bg-accent/40 border-b transition-colors last:border-b-0"
                      >
                        <td className="px-3 py-1.5">
                          <SimpleLink href={`/leaderboard/${leaderboard.id}`} className="block">
                            <ScoreSongInfo
                              song={{
                                name: leaderboard.fullName,
                                authorName: leaderboard.songAuthorName,
                                art: leaderboard.songArt,
                              }}
                              level={{
                                authorName: leaderboard.levelAuthorName,
                                difficulty: leaderboard.difficulty.difficulty,
                              }}
                              imageSize={42}
                              clickableSongName={false}
                            />
                          </SimpleLink>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="text-foreground/90 flex items-center justify-center gap-1 text-xs font-medium">
                            {leaderboard.ranked ? (
                              <>
                                <StarFilledIcon className="h-3.5 w-3.5" />
                                <span>{leaderboard.stars.toFixed(2)}</span>
                              </>
                            ) : (
                              <span>Unranked</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs">
                          <SimpleTooltip display="The total number of plays on this leaderboard">
                            <p>{formatNumberWithCommas(leaderboard.plays)}</p>
                          </SimpleTooltip>
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs">
                          {leaderboard.timestamp && (
                            <SimpleTooltip
                              display={
                                <p>
                                  {leaderboard.status == "Unranked" ? "Created" : leaderboard.status}{" "}
                                  {timeAgo(leaderboard.timestamp)} (
                                  {formatDate(leaderboard.timestamp, "Do MMMM, YYYY HH:mm a")})
                                </p>
                              }
                            >
                              <p className="text-gray-400">{timeAgo(leaderboard.timestamp)}</p>
                            </SimpleTooltip>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {leaderboardResponse && (
          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={leaderboardResponse.metadata.totalItems}
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
