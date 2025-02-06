"use client";

import Card from "@/components/card";
import PlayerViews from "@/components/player/history-views/player-views";
import PlayerBadges from "@/components/player/player-badges";
import useDatabase from "@/hooks/use-database";
import useSettings from "@/hooks/use-settings";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { DetailType } from "@ssr/common/detail-type";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { ScoreSort } from "@ssr/common/score/score-sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import PlayerHeader from "./header/player-header";
import PlayerScores from "./player-scores";

// Dynamically import Mini component only on client-side
const Mini = dynamic(() => import("../ranking/mini"), { ssr: false });

interface PlayerDataProps {
  initialPlayerData: ScoreSaberPlayer;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
}

export default function PlayerData({
  initialPlayerData,
  initialSearch,
  sort,
  page,
}: PlayerDataProps) {
  const { width } = useWindowDimensions();
  const database = useDatabase();
  const settings = useSettings();
  const isFriend = useLiveQuery(() => database.isFriend(initialPlayerData.id));

  const { data: playerData } = useQuery({
    queryKey: ["playerData", initialPlayerData.id, settings?.playerId, isFriend],
    queryFn: () =>
      ssrApi.getScoreSaberPlayer(initialPlayerData.id, {
        createIfMissing: settings?.playerId === initialPlayerData.id,
        type: DetailType.FULL,
      }),
    initialData: initialPlayerData,
  });

  const player = playerData ?? initialPlayerData;
  const showRankings = width > 1536 && !player.inactive && !player.banned;

  return (
    <div className="flex gap-2 justify-center w-full">
      <article className="flex flex-1 flex-col gap-2">
        <PlayerHeader player={player} />
        <Card className="gap-1">
          <PlayerBadges player={player} />
          {!player.inactive && <PlayerViews player={player} />}
        </Card>
        <PlayerScores initialSearch={initialSearch} player={player} sort={sort} page={page} />
      </article>

      {showRankings && (
        <aside className="w-[400px] hidden 2xl:flex flex-col gap-2">
          <Mini type="Global" player={player} />
          <Mini type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
