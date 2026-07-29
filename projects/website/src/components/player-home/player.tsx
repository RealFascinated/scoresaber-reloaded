"use client";

import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import PlayerPreviewHeader from "../player/header/player-preview-header";
import { Spinner } from "../spinner";

export function Player() {
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", mainPlayerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(mainPlayerId!, "full"),
    enabled: !!mainPlayerId,
  });

  return (
    <div>
      {isLoading && (
        <div className="flex h-full items-center justify-center py-12">
          <Spinner />
        </div>
      )}
      {player && <PlayerPreviewHeader player={player} />}
    </div>
  );
}
