"use client";

import Card from "@/components/card";
import { useQuery } from "@tanstack/react-query";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useCallback, useEffect, useState } from "react";
import { LoadingIcon } from "@/components/loading-icon";
import Pagination from "@/components/input/pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import Link from "next/link";
import ScoreSaberLeaderboardPageToken from "@ssr/common/types/token/scoresaber/leaderboard-page";
import { useDebounce } from "@uidotdev/usehooks";
import { motion, useAnimation } from "framer-motion";
import { scoreAnimation } from "@/components/score/score-animation";
import ScoreSongInfo from "@/components/score/score-song-info";

export default function Maps() {
  const controls = useAnimation();
  const isMobile = useIsMobile();
  const filter = useMapFilter();
  const filterDebounced = useDebounce(filter, 100);

  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [leaderboards, setLeaderboards] = useState<ScoreSaberLeaderboardPageToken | undefined>();

  const { data, isLoading, isError } = useQuery({
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
  });

  /**
   * Starts the animation for the scores, but only after the initial load.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= page ? "hiddenRight" : "hiddenLeft");
    setLeaderboards(data);
    await controls.start("visible");
  }, [controls, page, previousPage, data]);

  /**
   * Set the leaderboards when the data is loaded
   */
  useEffect(() => {
    if (data && !isLoading && !isError) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation, isError, isLoading]);

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
            <motion.div
              initial="hidden"
              animate={controls}
              className="border-none flex flex-col gap-1.5"
              variants={scoreAnimation}
            >
              {leaderboards.leaderboards.map((leaderboardToken, index) => {
                const leaderboard = getScoreSaberLeaderboardFromToken(leaderboardToken);

                return (
                  <motion.div key={index} variants={scoreAnimation}>
                    <Link
                      prefetch={false}
                      href={`/leaderboard/${leaderboard.id}`}
                      className="flex gap-2 items-center bg-border p-1.5 hover:brightness-75 transition-all transform-gpu rounded-md"
                    >
                      <ScoreSongInfo leaderboard={leaderboard} imageSize={58} clickableSongName={false} />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <Pagination
            mobilePagination={isMobile}
            page={page}
            totalItems={leaderboards.metadata.total}
            itemsPerPage={leaderboards.metadata.itemsPerPage}
            loadingPage={isLoading ? page : undefined}
            onPageChange={newPage => {
              setPreviousPage(page);
              setPage(newPage);
            }}
            statsBelow={!isMobile}
          />
        </div>
      )}
    </Card>
  );
}
