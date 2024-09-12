"use client";

import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import ScoreSaberLeaderboard from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard";
import ScoreSaberLeaderboardScoresPage from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard-scores-page";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import LeaderboardScore from "./leaderboard-score";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardScores({ leaderboard }: Props) {
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [currentPage, setCurrentPage] = useState(1);
  const [currentScores, setCurrentScores] = useState<ScoreSaberLeaderboardScoresPage | undefined>();

  const {
    data: scores,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["playerScores", leaderboard.id, currentPage],
    queryFn: () => scoresaberFetcher.lookupLeaderboardScores(leaderboard.id + "", currentPage),
    staleTime: 30 * 1000, // Cache data for 30 seconds
  });

  const handleAnimation = useCallback(() => {
    controls.set({ x: -50, opacity: 0 });
    controls.start({ x: 0, opacity: 1, transition: { duration: 0.25 } });
  }, [controls]);

  useEffect(() => {
    if (scores) {
      setCurrentScores(scores);
    }
  }, [scores]);

  useEffect(() => {
    if (scores) {
      handleAnimation();
    }
  }, [scores, handleAnimation]);

  useEffect(() => {
    refetch();
  }, [leaderboard, currentPage, refetch]);

  if (currentScores === undefined) {
    return undefined;
  }

  return (
    <Card className="flex gap-2">
      <div className="text-center">
        {isError && <p>Oopsies! Something went wrong.</p>}
        {currentScores.scores.length === 0 && <p>No scores found. Invalid Page?</p>}
      </div>

      <motion.div animate={controls}>
        <div className="grid min-w-full grid-cols-1 divide-y divide-border">
          {currentScores.scores.map((playerScore, index) => (
            <LeaderboardScore key={index} score={playerScore} leaderboard={leaderboard} />
          ))}
        </div>
      </motion.div>

      <Pagination
        mobilePagination={width < 768}
        page={currentPage}
        totalPages={Math.ceil(currentScores.metadata.total / currentScores.metadata.itemsPerPage)}
        loadingPage={isLoading ? currentPage : undefined}
        onPageChange={setCurrentPage}
      />
    </Card>
  );
}
