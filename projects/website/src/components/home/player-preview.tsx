"use client";

import useDatabase from "@/hooks/use-database";
import { DetailType } from "@ssr/common/detail-type";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import Card from "../card";
import { LoadingIcon } from "../loading-icon";
import PlayerPreviewHeader from "../player/header/player-preview-header";

export function PlayerPreview() {
  const database = useDatabase();
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-preview", mainPlayerId],
    queryFn: () =>
      ssrApi.getScoreSaberPlayer(mainPlayerId!, {
        createIfMissing: true,
        type: DetailType.FULL,
      }),
    enabled: !!mainPlayerId,
  });

  return (
    <Card className="min-h-[180px] flex justify-center">
      {isLoading && (
        <div className="flex justify-center items-center h-full">
          <LoadingIcon />
        </div>
      )}
      {player && <PlayerPreviewHeader player={player} />}
    </Card>
  );
}
