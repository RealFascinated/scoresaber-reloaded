"use client";

import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import { ScoreSort } from "@/common/data-fetcher/sort";
import ScoreSaberPlayer from "@/common/data-fetcher/types/scoresaber/scoresaber-player";
import ScoreSaberPlayerScoresPage from "@/common/data-fetcher/types/scoresaber/scoresaber-player-scores-page";
import { capitalizeFirstLetter } from "@/common/string-utils";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ClockIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation, Variants } from "framer-motion";
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

const scoreAnimation: Variants = {
  hiddenRight: {
    opacity: 0,
    x: 50,
  },
  hiddenLeft: {
    opacity: 0,
    x: -50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

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
  const [previousPage, setPreviousPage] = useState(page);
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

  const handleScoreLoad = useCallback(async () => {
    await controls.start(previousPage >= currentPage ? "hiddenRight" : "hiddenLeft");
    setCurrentScores(scores);
    await controls.start("visible");
  }, [scores, controls]);

  useEffect(() => {
    if (scores) {
      handleScoreLoad();
    }
  }, [scores]);

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

      <motion.div
        initial="hidden"
        animate={controls}
        variants={scoreAnimation}
        className="grid min-w-full grid-cols-1 divide-y divide-border"
      >
        {currentScores.playerScores.map((playerScore, index) => (
          <motion.div key={index} variants={scoreAnimation}>
            <Score playerScore={playerScore} />
          </motion.div>
        ))}
      </motion.div>

      <Pagination
        mobilePagination={width < 768}
        page={currentPage}
        totalPages={Math.ceil(currentScores.metadata.total / currentScores.metadata.itemsPerPage)}
        loadingPage={isLoading ? currentPage : undefined}
        onPageChange={(page) => {
          setPreviousPage(currentPage);
          setCurrentPage(page);
        }}
      />
    </Card>
  );
}
