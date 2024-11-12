"use client";

import { useQuery } from "@tanstack/react-query";
import PlayerHeader from "./player-header";
import PlayerScores from "./player-scores";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import { useIsMobile } from "@/hooks/use-is-mobile";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import PlayerViews from "@/components/player/history-views/player-views";
import { getScoreSaberPlayer } from "@ssr/common/utils/player-utils";
import useSettings from "@/hooks/use-settings";
import dynamic from "next/dynamic";
import useWindowDimensions from "@/hooks/use-window-dimensions";

const Mini = dynamic(() => import("../ranking/mini"), { ssr: false });

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({ initialPlayerData, initialSearch, sort, page }: Props) {
  const dimensions = useWindowDimensions();
  const database = useDatabase();
  const settings = useSettings();
  const isFriend = useLiveQuery(() => database.isFriend(initialPlayerData.id));

  let player = initialPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerData", player.id, settings?.playerId, isFriend],
    queryFn: async (): Promise<ScoreSaberPlayer | undefined> =>
      getScoreSaberPlayer(player.id, settings?.playerId == player.id),
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <div className="flex gap-2">
      <article className="w-full 2xl:w-[1164px] flex flex-col gap-2">
        <PlayerHeader player={player} />
        <Card className="gap-1">
          <PlayerBadges player={player} />
          {!player.inactive && <PlayerViews player={player} />}
        </Card>
        <PlayerScores initialSearch={initialSearch} player={player} sort={sort} page={page} />
      </article>
      {dimensions.width > 1536 && !player.inactive && !player.banned && (
        <aside className="w-[400px] hidden 2xl:flex flex-col gap-2">
          <Mini type="Global" player={player} />
          <Mini type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
