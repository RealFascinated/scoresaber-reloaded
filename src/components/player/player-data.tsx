"use client";

import ScoreSaberPlayerScoresPageToken from "@/common/model/token/scoresaber/score-saber-player-scores-page-token";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/service/score-sort";
import { useQuery } from "@tanstack/react-query";
import Mini from "../ranking/mini";
import PlayerHeader from "./player-header";
import PlayerRankChart from "./player-rank-chart";
import PlayerScores from "./player-scores";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: ScoreSaberPlayerScoresPageToken;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({
  initialPlayerData: initalPlayerData,
  initialScoreData,
  sort,
  page,
}: Props) {
  let player = initalPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player", player.id],
    queryFn: () => scoresaberService.lookupPlayer(player.id),
    refetchInterval: REFRESH_INTERVAL,
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <div className="flex gap-2">
      <article className="flex flex-col gap-2">
        <PlayerHeader player={player} />
        {!player.inactive && (
          <Card className="gap-1">
            <PlayerBadges player={player} />
            <PlayerRankChart player={player} />
          </Card>
        )}
        <PlayerScores
          initialScoreData={initialScoreData}
          player={player}
          sort={sort}
          page={page}
        />
      </article>
      <aside className="w-[550px] hidden xl:flex flex-col gap-2">
        <Mini type="Global" player={player} />
        <Mini type="Country" player={player} />
      </aside>
    </div>
  );
}
