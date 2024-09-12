"use client";

import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";
import { ScoreSort } from "@/common/data-fetcher/sort";
import ScoreSaberPlayer from "@/common/data-fetcher/types/scoresaber/scoresaber-player";
import ScoreSaberPlayerScoresPage from "@/common/data-fetcher/types/scoresaber/scoresaber-player-scores-page";
import { useQuery } from "@tanstack/react-query";
import PlayerHeader from "./player-header";
import PlayerRankChart from "./player-rank-chart";
import PlayerScores from "./player-scores";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: ScoreSaberPlayerScoresPage;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({ initialPlayerData: initalPlayerData, initialScoreData, sort, page }: Props) {
  let player = initalPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player", player.id],
    queryFn: () => scoresaberFetcher.lookupPlayer(player.id),
    refetchInterval: REFRESH_INTERVAL,
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <div className="flex flex-col gap-2">
      <PlayerHeader player={player} />
      {!player.inactive && (
        <>
          <PlayerRankChart player={player} />
        </>
      )}
      <PlayerScores initialScoreData={initialScoreData} player={player} sort={sort} page={page} />
    </div>
  );
}
