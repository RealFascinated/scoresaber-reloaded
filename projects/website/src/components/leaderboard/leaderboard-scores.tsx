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
import { getDifficultyFromRawDifficulty } from "@/common/song-utils";
import { fetchLeaderboardScores } from "@ssr/common/utils/score-utils";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

type LeaderboardScoresProps = {
  initialPage?: number;
  initialScores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
  leaderboard: ScoreSaberLeaderboard;
  showDifficulties?: boolean;
  isLeaderboardPage?: boolean;
  leaderboardChanged?: (id: number) => void;
  disableUrlChanging?: boolean;
};

export default function LeaderboardScores({
  initialPage,
  initialScores,
  leaderboard,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
  disableUrlChanging,
}: LeaderboardScoresProps) {
  if (!initialPage) {
    initialPage = 1;
  }
  const database = useDatabase();
  const claimedPlayer = useLiveQuery(() => database.getClaimedPlayer());

  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState(leaderboard.id);
  const [previousPage, setPreviousPage] = useState(initialPage);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentScores, setCurrentScores] = useState<
    LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined
  >(initialScores);
  const topOfScoresRef = useRef<HTMLDivElement>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

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
   * Starts the animation for the scores, but only after the initial load.
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
    if (disableUrlChanging) {
      return;
    }

    // Update the URL
    window.history.replaceState(null, "", `/leaderboard/${selectedLeaderboardId}/${currentPage}`);
  }, [selectedLeaderboardId, currentPage, disableUrlChanging]);

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

      {showDifficulties && (
        <div className="flex gap-2 justify-center items-center flex-wrap">
          {leaderboard.difficulties.map(({ difficultyRaw, leaderboardId }) => {
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
      )}

      <div className="overflow-x-auto relative">
        <table className="table w-full table-auto border-spacing-2 border-none text-left text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1">Rank</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1 text-center">Time Set</th>
              <th className="px-2 py-1 text-center">Score</th>
              <th className="px-2 py-1 text-center">Accuracy</th>
              <th className="px-2 py-1 text-center">Misses</th>
              <th className="px-2 py-1 text-center">PP</th>
              <th className="px-2 py-1 text-center">Mods</th>
            </tr>
          </thead>
          <motion.tbody initial="hidden" animate={controls} className="border-none" variants={scoreAnimation}>
            {currentScores.scores.map((playerScore, index) => (
              <motion.tr key={index} className="border-b border-border" variants={scoreAnimation}>
                <LeaderboardScore score={playerScore} claimedPlayer={claimedPlayer} />
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

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
