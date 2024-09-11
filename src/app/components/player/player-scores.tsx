"use client";

import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import { ScoreSort } from "@/app/common/leaderboard/sort";
import ScoreSaberPlayer from "@/app/common/leaderboard/types/scoresaber/scoresaber-player";
import { useQuery } from "@tanstack/react-query";
import Card from "../card";
import Score from "./score";

type Props = {
  /**
   * The player to fetch scores for.
   */
  player: ScoreSaberPlayer;

  /**
   * The sort to use for fetching scores.
   */
  sort: ScoreSort;

  /**
   * The page to fetch scores for.
   */
  page: number;
};

export default function PlayerScores({ player, sort, page }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerScores", player.id],
    queryFn: () => scoresaberLeaderboard.lookupPlayerScores(player.id, sort, page),
  });

  console.log(data);

  if (data == undefined || isLoading || isError) {
    return null;
  }

  return (
    <Card className="gap-2">
      <div className="grid min-w-full grid-cols-1 divide-y divide-border">
        {data.playerScores.map((playerScore, index) => {
          return <Score key={index} playerScore={playerScore} />;
        })}
      </div>
    </Card>
  );
}
