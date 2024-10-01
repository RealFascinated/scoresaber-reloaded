"use client";

import { scoresaberService } from "@/common/service/impl/scoresaber";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import ScoreSaberLeaderboardScoresPageToken from "@/common/model/token/scoresaber/score-saber-leaderboard-scores-page-token";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import LeaderboardScore from "./leaderboard-score";
import { scoreAnimation } from "@/components/score/score-animation";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";

type LeaderboardScoresProps = {
  /**
   * The page to show when opening the leaderboard.
   */
  initialPage?: number;

  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboardToken;
};

export default function LeaderboardScores({ initialPage, player, leaderboard }: LeaderboardScoresProps) {
  if (!initialPage) {
    initialPage = 1;
  }
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentScores, setCurrentScores] = useState<ScoreSaberLeaderboardScoresPageToken | undefined>();
  const topOfScoresRef = useRef<HTMLDivElement>(null);

  const {
    data: scores,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["playerScores", leaderboard.id, currentPage],
    queryFn: () => scoresaberService.lookupLeaderboardScores(leaderboard.id + "", currentPage),
    staleTime: 30 * 1000, // Cache data for 30 seconds
  });

  /**
   * Starts the animation for the scores.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= currentPage ? "hiddenRight" : "hiddenLeft");
    setCurrentScores(scores);
    await controls.start("visible");
  }, [controls, currentPage, previousPage, scores]);

  /**
   * Set the current scores.
   */
  useEffect(() => {
    if (scores) {
      handleScoreAnimation();
    }
  }, [scores, handleScoreAnimation]);

  /**
   * Handle page change.
   */
  useEffect(() => {
    refetch();
  }, [leaderboard, currentPage, refetch]);

  /**
   * Handle scrolling to the top of the
   * scores when new scores are loaded.
   */
  useEffect(() => {
    if (topOfScoresRef.current) {
      const topOfScoresPosition = topOfScoresRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: topOfScoresPosition - 75, // Navbar height (plus some padding)
        behavior: "smooth",
      });
    }
  }, [currentPage, topOfScoresRef]);

  if (currentScores === undefined) {
    return undefined;
  }

  return (
    <motion.div initial={{ opacity: 0, y: -50 }} exit={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex gap-2 border border-input mt-2">
        {/* Where to scroll to when new scores are loaded */}
        <div ref={topOfScoresRef} className="absolute" />

        <div className="text-center">
          {isError && <p>Oopsies! Something went wrong.</p>}
          {currentScores.scores.length === 0 && <p>No scores found. Invalid Page?</p>}
        </div>

        <motion.div
          initial="hidden"
          animate={controls}
          variants={scoreAnimation}
          className="grid min-w-full grid-cols-1 divide-y divide-border"
        >
          {currentScores.scores.map((playerScore, index) => (
            <motion.div key={index} variants={scoreAnimation}>
              <LeaderboardScore key={index} player={player} score={playerScore} leaderboard={leaderboard} />
            </motion.div>
          ))}
        </motion.div>

        <Pagination
          mobilePagination={width < 768}
          page={currentPage}
          totalPages={Math.ceil(currentScores.metadata.total / currentScores.metadata.itemsPerPage)}
          loadingPage={isLoading ? currentPage : undefined}
          onPageChange={newPage => {
            setCurrentPage(newPage);
            setPreviousPage(currentPage);
          }}
        />
      </Card>
    </motion.div>
  );
}
