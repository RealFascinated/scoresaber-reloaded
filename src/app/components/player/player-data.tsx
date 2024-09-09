"use client";

import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import ScoreSaberPlayer from "@/app/common/leaderboard/types/scoresaber/scoresaber-player";
import { useQuery } from "@tanstack/react-query";
import PlayerHeader from "./player-header";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

type Props = {
  initalPlayerData: ScoreSaberPlayer;
};

export default function PlayerData({ initalPlayerData }: Props) {
  let player = initalPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player", player.id],
    queryFn: () => scoresaberLeaderboard.lookupPlayer(player.id),
    refetchInterval: REFRESH_INTERVAL,
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <div className="flex flex-col gap-2">
      <PlayerHeader player={player} />
    </div>
  );
}
