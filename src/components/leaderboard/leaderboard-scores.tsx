"use client";

import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import ScoreSaberLeaderboard from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard";
import ScoreSaberLeaderboardScoresPage from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard-scores-page";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import LeaderboardScore from "./leaderboard-score";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardScores({ leaderboard }: Props) {
  const { width } = useWindowDimensions();

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

  useEffect(() => {
    if (scores) {
      setCurrentScores(scores);
    }
  }, [scores]);

  useEffect(() => {
    refetch();
  }, [leaderboard, currentPage, refetch]);

  if (currentScores === undefined) {
    return undefined;
  }

  return (
    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex gap-2">
        <div className="text-center">
          {isError && <p>Oopsies! Something went wrong.</p>}
          {currentScores.scores.length === 0 && <p>No scores found. Invalid Page?</p>}
        </div>

        <div className="grid min-w-full grid-cols-1 divide-y divide-border">
          {currentScores.scores.map((playerScore, index) => (
            <LeaderboardScore key={index} score={playerScore} leaderboard={leaderboard} />
          ))}
        </div>

        <Pagination
          mobilePagination={width < 768}
          page={currentPage}
          totalPages={Math.ceil(currentScores.metadata.total / currentScores.metadata.itemsPerPage)}
          loadingPage={isLoading ? currentPage : undefined}
          onPageChange={setCurrentPage}
        />
      </Card>
    </motion.div>
  );
}
