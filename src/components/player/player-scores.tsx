"use client";

import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import { ScoreSort } from "@/common/data-fetcher/sort";
import ScoreSaberPlayer from "@/common/data-fetcher/types/scoresaber/scoresaber-player";
import ScoreSaberPlayerScoresPage from "@/common/data-fetcher/types/scoresaber/scoresaber-player-scores-page";
import { capitalizeFirstLetter } from "@/common/string-utils";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ClockIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";
import Score from "./score/score";

const scoreSort = [
  {
    name: "Top",
    value: ScoreSort.top,
    icon: <TrophyIcon className="w-5 h-5" />,
  },
  {
    name: "Recent",
    value: ScoreSort.recent,
    icon: <ClockIcon className="w-5 h-5" />,
  },
];

type Props = {
  initialScoreData?: ScoreSaberPlayerScoresPage;
  player: ScoreSaberPlayer;
  sort: ScoreSort;
  page: number;
};

export default function PlayerScores({ initialScoreData, player, sort, page }: Props) {
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [currentSort, setCurrentSort] = useState(sort);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentScores, setCurrentScores] = useState<ScoreSaberPlayerScoresPage | undefined>(initialScoreData);

  const {
    data: scores,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["playerScores", player.id, currentSort, currentPage],
    queryFn: () => scoresaberFetcher.lookupPlayerScores(player.id, currentSort, currentPage),
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
    const newUrl = `/player/${player.id}/${currentSort}/${currentPage}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    refetch();
  }, [currentSort, currentPage, refetch, player.id]);

  const handleSortChange = (newSort: ScoreSort) => {
    if (newSort !== currentSort) {
      setCurrentSort(newSort);
      setCurrentPage(1); // Reset page to 1 on sort change
    }
  };

  if (currentScores === undefined) {
    return undefined;
  }

  return (
    <Card className="flex gap-4">
      <div className="flex items-center flex-row w-full gap-2 justify-center">
        {Object.values(scoreSort).map((sortOption, index) => (
          <Button
            variant={sortOption.value === currentSort ? "default" : "outline"}
            key={index}
            onClick={() => handleSortChange(sortOption.value)}
            size="sm"
            className="flex items-center gap-1"
          >
            {sortOption.icon}
            {`${capitalizeFirstLetter(sortOption.name)} Scores`}
          </Button>
        ))}
      </div>

      <div className="text-center">
        {isError && <p>Oopsies! Something went wrong.</p>}
        {currentScores.playerScores.length === 0 && <p>No scores found. Invalid Page?</p>}
      </div>

      <motion.div animate={controls}>
        <div className="grid min-w-full grid-cols-1 divide-y divide-border">
          {currentScores.playerScores.map((playerScore, index) => (
            <Score key={index} playerScore={playerScore} />
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
