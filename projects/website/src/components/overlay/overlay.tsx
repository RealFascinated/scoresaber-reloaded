"use client";

import { OverlaySettings } from "@/common/overlay/overlay-settings";
import OverlayPlayerInfo from "@/components/overlay/views/player-info";
import { useQuery } from "@tanstack/react-query";
import { LoadingIcon } from "@/components/loading-icon";
import { getScoreSaberPlayer } from "@ssr/common/utils/player-utils";
import { OverlayViewPosition } from "./views/view";

export default function Overlay({ playerId }: OverlaySettings) {
  const { data: player, isLoading } = useQuery({
    queryKey: ["overlay:player"],
    queryFn: async () =>
      getScoreSaberPlayer(playerId, {
        superJson: true,
      }),
    refetchInterval: 1000 * 30, // 30 seconds
  });

  if (isLoading || !player) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <LoadingIcon />
      </div>
    );
  }

  return (
    <div>
      <OverlayPlayerInfo position={OverlayViewPosition.TOP_LEFT} player={player} />
    </div>
  );
}
