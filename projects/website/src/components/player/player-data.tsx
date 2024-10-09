"use client";

import { useQuery } from "@tanstack/react-query";
import Mini from "../ranking/mini";
import PlayerHeader from "./player-header";
import PlayerScores from "./player-scores";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useIsVisible } from "@/hooks/use-is-visible";
import { useRef } from "react";
import PlayerCharts from "@/components/player/chart/player-charts";
import ScoreSaberPlayer, { getScoreSaberPlayerFromToken } from "@ssr/common/types/player/impl/scoresaber-player";
import ScoreSaberPlayerScoresPageToken from "@ssr/common/types/token/scoresaber/score-saber-player-scores-page-token";
import { ScoreSort } from "@ssr/common/types/score/score-sort";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { config } from "../../../config";
import { getPlayerIdCookie } from "@/common/website-utils";

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: ScoreSaberPlayerScoresPageToken;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({
  initialPlayerData: initialPlayerData,
  initialScoreData,
  initialSearch,
  sort,
  page,
}: Props) {
  const isMobile = useIsMobile();
  const miniRankingsRef = useRef<HTMLDivElement>(null);
  const isMiniRankingsVisible = useIsVisible(miniRankingsRef);

  let player = initialPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["player", player.id],
    queryFn: async (): Promise<ScoreSaberPlayer | undefined> => {
      const playerResponse = await scoresaberService.lookupPlayer(player.id);
      if (playerResponse == undefined) {
        return undefined;
      }
      return await getScoreSaberPlayerFromToken(playerResponse, config.siteApi, getPlayerIdCookie());
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
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
            <PlayerCharts player={player} />
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
        <aside ref={miniRankingsRef} className="w-[600px] hidden 2xl:flex flex-col gap-2">
          <Mini shouldUpdate={isMiniRankingsVisible} type="Global" player={player} />
          <Mini shouldUpdate={isMiniRankingsVisible} type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
