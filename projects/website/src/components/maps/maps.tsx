"use client";

import Card from "@/components/card";
import { useQuery } from "@tanstack/react-query";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useEffect, useState } from "react";
import { LoadingIcon } from "@/components/loading-icon";
import Pagination from "@/components/input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import Image from "next/image";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { truncateText } from "@/common/string-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import ScoreSaberLeaderboardPageToken from "@ssr/common/types/token/scoresaber/leaderboard-page";
import { useDebounce } from "@uidotdev/usehooks";

export default function Maps() {
  const isMobile = useIsMobile();
  const filter = useMapFilter();
  const filterDebounced = useDebounce(filter, 100);

  const [page, setPage] = useState(1);
  const [leaderboards, setLeaderboards] = useState<ScoreSaberLeaderboardPageToken | undefined>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maps", filterDebounced, page],
    queryFn: async () =>
      scoresaberService.lookupLeaderboards(page, {
        category: filterDebounced.category,
        sort: filterDebounced.sort,
        stars: filterDebounced.stars,
      }),
  });

  /**
   * Set the leaderboards when the data is loaded
   */
  useEffect(() => {
    if (data && !isLoading && !isError) {
      setLeaderboards(data);
    }
  }, [data, isError, isLoading]);

  /**
   * Reset the page when the filter changes
   */
  useEffect(() => {
    setPage(1);
  }, [filter]);

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
            {leaderboards.leaderboards.map((leaderboardToken, index) => {
              const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

              return (
                <Link
                  key={index}
                  href={`/leaderboard/${leaderboard.id}`}
                  className="flex gap-2 items-center bg-border p-1.5 hover:brightness-75 transition-all transform-gpu rounded-md"
                >
                  <Image
                    src={leaderboard.songArt}
                    width={54}
                    height={54}
                    className={"rounded-md"}
                    alt={leaderboard.songName}
                  />
                  <div className="flex flex-col">
                    <p>{truncateText(leaderboard.fullName, 96)}</p>
                    <div className="text-xs">
                      <div className="flex gap-2 items-center">
                        <span
                          style={{
                            color: getDifficulty(leaderboard.difficulty.difficulty).color + "f0", // Transparency value (in hex 0-255)
                          }}
                        >
                          {getDifficultyName(leaderboard.difficulty.difficulty)}
                        </span>{" "}
                        {leaderboard.ranked && (
                          <>
                            -{" "}
                            <div className="flex gap-1 text-pp items-center">
                              <p>{leaderboard.stars.toFixed(2)}</p>
                              <StarIcon className="w-fit h-fit" />
                            </div>
                          </>
                        )}
                        {leaderboard.qualified && (
                          <>
                            - <span className="text-gray-400">Qualified</span>
                          </>
                        )}
                      </div>
                      <div className="text-gray-300">Mapper: {leaderboard.levelAuthorName}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <Pagination
            mobilePagination={isMobile}
            page={page}
            totalItems={leaderboards.metadata.total}
            itemsPerPage={leaderboards.metadata.itemsPerPage}
            loadingPage={isLoading ? page : undefined}
            onPageChange={newPage => {
              setPage(newPage);
            }}
          />
        </div>
      )}
    </Card>
  );
}
