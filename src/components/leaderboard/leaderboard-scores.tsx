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
import { Button } from "@/components/ui/button";
import { getDifficultyFromScoreSaberDifficulty } from "@/common/scoresaber-utils";
import { clsx } from "clsx";

type LeaderboardScoresProps = {
  /**
   * The page to show when opening the leaderboard.
   */
  initialPage?: number;

  /**
   * The initial scores to show.
   */
  initialScores?: ScoreSaberLeaderboardScoresPageToken;

  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboardToken;

  /**
   * Whether to show the difficulties.
   */
  showDifficulties?: boolean;

  /**
   * Whether this is the full leaderboard page.
   */
  isLeaderboardPage?: boolean;

  /**
   * Called when the leaderboard changes.
   *
   * @param id the new leaderboard id
   */
  leaderboardChanged?: (id: number) => void;
};

export default function LeaderboardScores({
  initialPage,
  initialScores,
  player,
  leaderboard,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
}: LeaderboardScoresProps) {
  if (!initialPage) {
    initialPage = 1;
  }
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(leaderboard.id);
  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentScores, setCurrentScores] = useState<ScoreSaberLeaderboardScoresPageToken | undefined>(initialScores);
  const topOfScoresRef = useRef<HTMLDivElement>(null);
  const [shouldFetch, setShouldFetch] = useState(false); // New state to control fetching

  const {
    data: scores,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["leaderboardScores-" + leaderboard.id, selectedLeaderboardId, currentPage],
    queryFn: () => scoresaberService.lookupLeaderboardScores(selectedLeaderboardId + "", currentPage),
    staleTime: 30 * 1000, // Cache data for 30 seconds
    enabled: shouldFetch || isLeaderboardPage,
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
   * Set the selected leaderboard.
   */
  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setSelectedLeaderboardId(id);
      setCurrentPage(1);
      setShouldFetch(true);

      if (leaderboardChanged) {
        leaderboardChanged(id);
      }

      // Update the URL
      window.history.replaceState(null, "", `/leaderboard/${id}`);
    },
    [leaderboardChanged]
  );

  /**
   * Set the current scores.
   */
  useEffect(() => {
    if (scores) {
      handleScoreAnimation();
    }
  }, [scores, handleScoreAnimation]);

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
    <Card className={clsx("flex gap-2 w-full relative", !isLeaderboardPage && "border border-input")}>
      {/* Where to scroll to when new scores are loaded */}
      <div ref={topOfScoresRef} className="absolute" />

      <div className="text-center">
        {isError && <p>Oopsies! Something went wrong.</p>}
        {currentScores.scores.length === 0 && <p>No scores found. Invalid Page?</p>}
      </div>

      <div className="flex gap-2 justify-center items-center">
        {showDifficulties &&
          leaderboard.difficulties.map(({ difficulty, leaderboardId }) => {
            return (
              <Button
                key={difficulty}
                variant={leaderboardId === selectedLeaderboardId ? "default" : "outline"}
                onClick={() => {
                  handleLeaderboardChange(leaderboardId);
                }}
              >
                {getDifficultyFromScoreSaberDifficulty(difficulty)}
              </Button>
            );
          })}
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
          setShouldFetch(true);
        }}
      />
    </Card>
  );
}
