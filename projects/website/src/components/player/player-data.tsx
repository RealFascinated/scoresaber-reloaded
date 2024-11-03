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
import PlayerStatHistoryViews from "@/components/player/chart/player-stat-history-views";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import { getScoreSaberPlayerFromToken } from "@ssr/common/token-creators";

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({ initialPlayerData, initialScoreData, initialSearch, sort, page }: Props) {
  const isMobile = useIsMobile();
  const miniRankingsRef = useRef<HTMLDivElement>(null);
  const isMiniRankingsVisible = useIsVisible(miniRankingsRef);
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());
  const isFriend = useLiveQuery(() => database.isFriend(initialPlayerData.id));

  let player = initialPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerData", player.id, settings?.playerId, isFriend],
    queryFn: async (): Promise<ScoreSaberPlayer | undefined> => {
      const playerResponse = await scoresaberService.lookupPlayer(player.id);
      if (playerResponse == undefined) {
        return undefined;
      }
      return await getScoreSaberPlayerFromToken(playerResponse, settings?.playerId);
    },
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <div className="flex gap-2">
      <article className="flex flex-col gap-2">
        <PlayerHeader player={player} />
        <Card className="gap-1">
          <PlayerBadges player={player} />
          {!player.inactive && <PlayerStatHistoryViews player={player} />}
        </Card>
        <PlayerScores
          initialScoreData={initialScoreData}
          initialSearch={initialSearch}
          player={player}
          sort={sort}
          page={page}
        />
      </article>
      {!isMobile && !player.inactive && !player.banned && (
        <aside ref={miniRankingsRef} className="w-[600px] hidden 2xl:flex flex-col gap-2">
          <Mini shouldUpdate={isMiniRankingsVisible} type="Global" player={player} />
          <Mini shouldUpdate={isMiniRankingsVisible} type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
