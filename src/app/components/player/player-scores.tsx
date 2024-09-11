"use client";

import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import { ScoreSort } from "@/app/common/leaderboard/sort";
import ScoreSaberPlayer from "@/app/common/leaderboard/types/scoresaber/scoresaber-player";
import ScoreSaberPlayerScoresPage from "@/app/common/leaderboard/types/scoresaber/scoresaber-player-scores-page";
import { capitalizeFirstLetter } from "@/app/common/string-utils";
import useWindowDimensions from "@/app/hooks/use-window-dimensions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";
import Score from "./score";

type Props = {
  player: ScoreSaberPlayer;
  sort: ScoreSort;
  page: number;
};

export default function PlayerScores({ player, sort, page }: Props) {
  const { width } = useWindowDimensions();
  const [currentSort, setCurrentSort] = useState(sort);
  const [currentPage, setCurrentPage] = useState(page);
  const [previousScores, setPreviousScores] = useState<ScoreSaberPlayerScoresPage | undefined>();

  const { data, isError, refetch } = useQuery({
    queryKey: ["playerScores", player.id, currentSort, currentPage],
    queryFn: () => scoresaberLeaderboard.lookupPlayerScores(player.id, currentSort, currentPage),
  });

  useEffect(() => {
    if (data) {
      setPreviousScores(data);
    }
  }, [data]);

  useEffect(() => {
    // Update URL and refetch data when currentSort or currentPage changes
    const newUrl = `/player/${player.id}/${currentSort}/${currentPage}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    refetch();
  }, [currentSort, currentPage, refetch, player.id]);

  /**
   * Updates the current sort and resets the page to 1
   */
  function handleSortChange(newSort: ScoreSort) {
    if (newSort !== currentSort) {
      setCurrentSort(newSort);
      setCurrentPage(1); // Reset the page
    }
  }

  if (previousScores === undefined) {
    return null;
  }

  if (isError) {
    return (
      <Card className="gap-2">
        <p>Oopsies!</p>
      </Card>
    );
  }

  return (
    <Card className="flex gap-4">
      <div className="flex items-center flex-row w-full gap-2 justify-center">
        {Object.keys(ScoreSort).map((sort, index) => (
          <Button
            variant={sort == currentSort ? "default" : "outline"}
            key={index}
            onClick={() => handleSortChange(sort as ScoreSort)}
          >
            {capitalizeFirstLetter(sort)}
          </Button>
        ))}
      </div>

      <div className="grid min-w-full grid-cols-1 divide-y divide-border">
        {previousScores.playerScores.map((playerScore, index) => (
          <Score key={index} playerScore={playerScore} />
        ))}
      </div>

      <Pagination
        mobilePagination={width < 768}
        page={currentPage}
        totalPages={Math.ceil(previousScores.metadata.total / previousScores.metadata.itemsPerPage)}
        onPageChange={(newPage) => {
          setCurrentPage(newPage);
        }}
      />
    </Card>
  );
}
