"use client";

import useDatabase from "@/hooks/use-database";
import Card from "../card";
import useSettings from "@/hooks/use-settings";
import { useLiveQuery } from "dexie-react-hooks";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { DetailType } from "@ssr/common/detail-type";
import { useQuery } from "@tanstack/react-query";
import { LoadingIcon } from "../loading-icon";
import PlayerPreviewHeader from "../player/header/player-preview-header";

export function PlayerPreview() {
  const settings = useSettings();
  const claimedPlayer = useLiveQuery(() => settings.playerId);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-preview", claimedPlayer],
    queryFn: () =>
      ssrApi.getScoreSaberPlayer(claimedPlayer!, {
        createIfMissing: true,
        type: DetailType.FULL,
      }),
    enabled: !!claimedPlayer,
  });

  return (
    <Card className="h-[180px] flex justify-center">
      {isLoading && (
        <div className="flex justify-center items-center h-full">
          <LoadingIcon />
        </div>
      )}
      {player && <PlayerPreviewHeader player={player} />}
    </Card>
  );
}
