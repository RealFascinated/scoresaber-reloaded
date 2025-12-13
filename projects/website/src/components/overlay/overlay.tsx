"use client";

import { OverlayDataClients } from "@/common/overlay/data-client";
import BeatSaberPlusClient from "@/common/overlay/impl/beatsaberplus";
import HTTPSiraStatusClient from "@/common/overlay/impl/httpsirastatus";
import { useOverlayDataStore } from "@/common/overlay/overlay-data-store";
import { OverlaySettings, OverlayViews } from "@/common/overlay/overlay-settings";
import OverlayPlayerInfoView from "@/components/overlay/views/player-info";
import OverlayScoreDataView from "@/components/overlay/views/score-data";
import OverlaySongInfoView from "@/components/overlay/views/song-info";
import { Spinner } from "@/components/spinner";
import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import OverlayView, { OverlayViewPosition } from "./views/view";

type OverlayProps = {
  /**
   * The overlay settings.
   */
  settings: OverlaySettings;
};

export default function Overlay({ settings }: OverlayProps) {
  const { data: player, isLoading } = useQuery({
    queryKey: ["player", settings.playerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(settings.playerId, DetailType.FULL),
    refetchInterval: 1000 * 30,
  });

  const overlayData = useOverlayDataStore();
  const clientRef = useRef<HTTPSiraStatusClient | null>(null);

  useEffect(() => {
    // Only use the data client if it's enabled
    if (!settings.useRealTimeData) {
      return;
    }

    if (!clientRef.current) {
      switch (settings.dataClient) {
        case OverlayDataClients.HTTPSiraStatus:
          clientRef.current = new HTTPSiraStatusClient();
          break;
        case OverlayDataClients.BeatSaberPlus:
          clientRef.current = new BeatSaberPlusClient();
          break;
      }
    }

    return () => {
      // Cleanup the client
      if (clientRef.current) {
        clientRef.current.disconnect?.();
        clientRef.current = null;
      }
    };
  }, [settings.dataClient, settings.useRealTimeData]);

  useEffect(() => {
    Logger.info("Overlay settings", JSON.stringify(settings, null, 2));
  }, []);

  if (isLoading || !player) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <OverlayView position={OverlayViewPosition.TOP_LEFT} className="flex flex-col gap-2 text-2xl">
        {settings.views[OverlayViews.PlayerInfo] && <OverlayPlayerInfoView player={player} />}
        {overlayData && settings.views[OverlayViews.ScoreInfo] && <OverlayScoreDataView overlayData={overlayData} />}
      </OverlayView>
      {overlayData && overlayData.map && settings.views[OverlayViews.SongInfo] && (
        <OverlaySongInfoView overlayData={overlayData} />
      )}
    </div>
  );
}
