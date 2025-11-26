"use client";

import useDatabase from "@/hooks/use-database";
import { DetailType } from "@ssr/common/detail-type";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import Card from "../card";
import PlayerPreviewHeader from "../player/header/player-preview-header";
import { Spinner } from "../spinner";

export function PlayerPreview() {
  const database = useDatabase();
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-preview-home", mainPlayerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(mainPlayerId!, DetailType.FULL),
    enabled: !!mainPlayerId,
  });

  return (
    <Card className="flex min-h-[180px] justify-center">
      {isLoading && (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      )}
      {player && <PlayerPreviewHeader player={player} />}
    </Card>
  );
}
