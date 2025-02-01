"use client";

import { useQuery } from "@tanstack/react-query";
import PlayerHeader from "./player-header";
import PlayerScores from "./player-scores";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import PlayerViews from "@/components/player/history-views/player-views";
import useSettings from "@/hooks/use-settings";
import dynamic from "next/dynamic";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { LoadingIcon } from "@/components/loading-icon";
import { Suspense } from "react";

const Mini = dynamic(() => import("../ranking/mini"), { ssr: false });

type Props = {
  playerId: string;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({ playerId, initialSearch, sort, page }: Props) {
  const dimensions = useWindowDimensions();
  const database = useDatabase();
  const settings = useSettings();
  const isFriend = useLiveQuery(() => database.isFriend(playerId));

  const { data: player, isLoading } = useQuery({
    queryKey: ["playerData", playerId, settings?.playerId, isFriend],
    queryFn: async (): Promise<ScoreSaberPlayer | undefined> =>
      ssrApi.getScoreSaberPlayer(playerId, {
        createIfMissing: settings?.playerId == playerId,
      }),
  });

  return (
    <div className="flex gap-2 justify-center w-full h-full">
      {!player && isLoading && (
        <div className="flex h-full w-full justify-center items-center">
          <LoadingIcon />
        </div>
      )}
      {player && (
        <Suspense>
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
        </Suspense>
      )}
    </div>
  );
}
