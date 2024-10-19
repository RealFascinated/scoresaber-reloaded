"use client";

import useWindowDimensions from "@/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import LeaderboardScore from "./leaderboard-score";
import { scoreAnimation } from "@/components/score/score-animation";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { getDifficulty, getDifficultyFromRawDifficulty } from "@/common/song-utils";
import { fetchLeaderboardScores } from "@ssr/common/utils/score-utils";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";

type LeaderboardScoresProps = {
  /**
   * The page to show when opening the leaderboard.
   */
  initialPage?: number;

  /**
   * The initial scores to show.
   */
  initialScores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

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
  const [currentScores, setCurrentScores] = useState<
    LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined
  >(initialScores);
  const topOfScoresRef = useRef<HTMLDivElement>(null);
  const [shouldFetch, setShouldFetch] = useState(true);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["leaderboardScores", selectedLeaderboardId, currentPage],
    queryFn: () =>
      fetchLeaderboardScores<ScoreSaberScore, ScoreSaberLeaderboard>(
        "scoresaber",
        selectedLeaderboardId + "",
        currentPage
      ),
    staleTime: 30 * 1000,
    enabled: (shouldFetch && isLeaderboardPage) || !isLeaderboardPage,
  });

  /**
   * Starts the animation for the scores.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= currentPage ? "hiddenRight" : "hiddenLeft");
    setCurrentScores(data);
    await controls.start("visible");
  }, [controls, currentPage, previousPage, data]);

  /**
   * Set the selected leaderboard.
   */
  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setShouldFetch(true);
      setSelectedLeaderboardId(id);
      setCurrentPage(1);

      // Call the leaderboard changed callback
      if (leaderboardChanged) {
        leaderboardChanged(id);
      }
    },
    [leaderboardChanged]
  );

  /**
   * Set the current scores.
   */
  useEffect(() => {
    if (data) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation]);

  /**
   * Handle scrolling to the top of the
   * scores when new scores are loaded.
   */
  useEffect(() => {
    if (topOfScoresRef.current && shouldFetch) {
      const topOfScoresPosition = topOfScoresRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: topOfScoresPosition - 75, // Navbar height (plus some padding)
        behavior: "smooth",
      });
    }
  }, [currentPage, topOfScoresRef, shouldFetch]);

  useEffect(() => {
    // Update the URL
    window.history.replaceState(null, "", `/leaderboard/${selectedLeaderboardId}/${currentPage}`);
  }, [selectedLeaderboardId, currentPage]);

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

      <div className="flex gap-2 justify-center items-center flex-wrap">
        {showDifficulties &&
          leaderboard.difficulties.map(({ difficultyRaw, leaderboardId }) => {
            const difficulty = getDifficultyFromRawDifficulty(difficultyRaw);
            // todo: add support for other gamemodes?
            if (difficulty.gamemode !== "Standard") {
              return null;
            }

            const isSelected = leaderboardId === selectedLeaderboardId;
            return (
              <Button
                key={difficultyRaw}
                variant={isSelected ? "default" : "outline"}
                onClick={() => {
                  handleLeaderboardChange(leaderboardId);
                }}
                className={`border ${isSelected ? "bg-primary/5 font-bold" : ""}`}
                style={{
                  color: getDifficultyFromRawDifficulty(difficultyRaw).color,
                  borderColor: getDifficultyFromRawDifficulty(difficultyRaw).color,
                }}
              >
                {difficulty.name}
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
        {currentScores.scores.map((playerScore, index) => {
          return (
            <motion.div key={index} variants={scoreAnimation}>
              <LeaderboardScore key={index} player={player} score={playerScore} leaderboard={leaderboard} />
            </motion.div>
          );
        })}
      </motion.div>

      <Pagination
        mobilePagination={width < 768}
        page={currentPage}
        totalPages={currentScores.metadata.totalPages}
        loadingPage={isLoading ? currentPage : undefined}
        generatePageUrl={page => {
          return `/leaderboard/${selectedLeaderboardId}/${page}`;
        }}
        onPageChange={newPage => {
          setCurrentPage(newPage);
          setPreviousPage(currentPage);
          setShouldFetch(true);
        }}
      />
    </Card>
  );
}
