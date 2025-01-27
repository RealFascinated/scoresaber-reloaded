"use client";

import { OverlaySettings } from "@/common/overlay/overlay-settings";
import OverlayPlayerInfoView from "@/components/overlay/views/player-info";
import { useQuery } from "@tanstack/react-query";
import { LoadingIcon } from "@/components/loading-icon";
import { getScoreSaberPlayer } from "@ssr/common/utils/player-utils";
import OverlayView, { OverlayViewPosition } from "./views/view";
import { useEffect, useRef } from "react";
import { OverlayDataClients } from "@/common/overlay/data-client";
import HTTPSiraStatusClient from "@/common/overlay/impl/httpsirastatus";
import OverlayScoreDataView from "@/components/overlay/views/score-data";
import { useOverlayDataStore } from "@/common/overlay/overlay-data-store";

type OverlayProps = {
  settings: OverlaySettings;
};

export default function Overlay({ settings }: OverlayProps) {
  const { data: player, isLoading } = useQuery({
    queryKey: ["overlay:player"],
    queryFn: async () =>
      getScoreSaberPlayer(settings.playerId, {
        superJson: true,
      }),
    refetchInterval: 1000 * 30,
  });

  const overlayData = useOverlayDataStore();
  const clientRef = useRef<HTTPSiraStatusClient | null>(null);

  useEffect(() => {
    // Only use the data client if it's enabled
    if (!settings.useRealTimeData) {
      return;
    }

    if (settings.dataClient === OverlayDataClients.HTTPSiraStatus && !clientRef.current) {
      clientRef.current = new HTTPSiraStatusClient();
    }

    return () => {
      // Cleanup the client
      if (clientRef.current) {
        clientRef.current.disconnect?.();
        clientRef.current = null;
      }
    };
  }, [settings.dataClient, settings.useRealTimeData]);

  if (isLoading || !player) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <LoadingIcon />
      </div>
    );
  }

  return (
    <div>
      <OverlayView position={OverlayViewPosition.TOP_LEFT} className="flex gap-2 flex-col text-2xl">
        <OverlayPlayerInfoView player={player} />
        {overlayData && <OverlayScoreDataView overlayData={overlayData} />}
      </OverlayView>
    </div>
  );
}
