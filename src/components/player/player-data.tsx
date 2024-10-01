"use client";

import ScoreSaberPlayerScoresPageToken from "@/common/model/token/scoresaber/score-saber-player-scores-page-token";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/model/score/score-sort";
import { useQuery } from "@tanstack/react-query";
import Mini from "../ranking/mini";
import PlayerHeader from "./player-header";
import PlayerRankChart from "./player-rank-chart";
import PlayerScores from "./player-scores";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import { useIsMobile } from "@/hooks/use-is-mobile";

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: ScoreSaberPlayerScoresPageToken;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({
  initialPlayerData: initalPlayerData,
  initialScoreData,
  initialSearch,
  sort,
  page,
}: Props) {
  const isMobile = useIsMobile();

  let player = initalPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player", player.id],
    queryFn: () => scoresaberService.lookupPlayer(player.id),
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });

  if (data && (!isLoading || !isError)) {
    player = data.player;
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
          initialSearch={initialSearch}
          player={player}
          sort={sort}
          page={page}
        />
      </article>
      {!isMobile && (
        <aside className="w-[600px] hidden 2xl:flex flex-col gap-2">
          <Mini type="Global" player={player} />
          <Mini type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
