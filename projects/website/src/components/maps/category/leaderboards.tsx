"use client";

import { DEBOUNCE_MS_FILTER } from "@/common/debounce";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimplePagination from "@/components/simple-pagination";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { SharedIcons } from "@/shared-icons";
import { Pagination } from "@ssr/common/pagination";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

export default function Leaderboards() {
  const filter = useMapFilter();
  const filterDebounced = useDebounce(filter, DEBOUNCE_MS_FILTER);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const {
    data: leaderboardResponse,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["maps", filterDebounced, page],
    queryFn: async () => {
      const response = await ssrApi.searchLeaderboards(page, {
        category: filterDebounced.category,
        sort: filterDebounced.sort,
        minStars: filterDebounced.starMin,
        maxStars: filterDebounced.starMax,
        ranked: filterDebounced.ranked,
        qualified: filterDebounced.qualified,
        query: filterDebounced.search.length > 3 ? filterDebounced.search : undefined,
      });
      return response ?? Pagination.empty<ScoreSaberLeaderboard>();
    },
    placeholderData: data => data,
  });

  const leaderboards = leaderboardResponse?.items;
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      {isLoading && leaderboardResponse == undefined && (
        <div className="flex w-full justify-center py-4">
          <Spinner />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {leaderboards?.length === 0 && (
          <div className="mb-2">
            <EmptyState
              className="ring-border rounded-xl ring-1"
              title="No Leaderboards Found"
              description="No leaderboards were found on this page"
              icon={
                <SharedIcons.LeaderboardEmptyStateIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              }
            />
          </div>
        )}

        {leaderboards && leaderboards.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leaderboard</TableHead>
                    <TableHead className="text-center">Stars</TableHead>
                    <TableHead className="text-center">Daily Plays</TableHead>
                    <TableHead className="text-center">Plays</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboards.map(leaderboard => (
                    <TableRow
                      key={leaderboard.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/leaderboard/${leaderboard.id}`)}
                    >
                      <TableCell className="py-1.5">
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
                          shortDiffNames
                          className="line-clamp-1"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          {leaderboard.ranked ? (
                            <>
                              <SharedIcons.QualifiedLeaderboardStarIcon className="h-3.5 w-3.5" />
                              <span>{leaderboard.stars.toFixed(2)}</span>
                            </>
                          ) : (
                            <span>Unranked</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center text-xs">
                        <SimpleTooltip display="Plays on this leaderboard in the last 24 hours">
                          <p className="inline-flex items-center justify-center gap-1">
                            <SharedIcons.PlayMapIcon className="h-3 w-3" />
                            {formatNumberWithCommas(leaderboard.dailyPlays)}
                          </p>
                        </SimpleTooltip>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center text-xs">
                        <SimpleTooltip display="Total plays on this leaderboard">
                          <p className="inline-flex items-center justify-center gap-1">
                            <SharedIcons.PlayMapIcon className="h-3 w-3" />
                            {formatNumberWithCommas(leaderboard.plays)}
                          </p>
                        </SimpleTooltip>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <SimpleTooltip
                          display={<p>{formatDate(leaderboard.timestamp, "Do MMMM, YYYY HH:mm a")}</p>}
                        >
                          <p className="text-muted-foreground">{timeAgo(leaderboard.timestamp)}</p>
                        </SimpleTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {leaderboards && leaderboards.length > 0 && (
          <SimplePagination
            page={page}
            totalItems={leaderboardResponse.metadata.totalItems}
            itemsPerPage={leaderboardResponse.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={newPage => setPage(newPage)}
          />
        )}
      </div>
    </div>
  );
}
