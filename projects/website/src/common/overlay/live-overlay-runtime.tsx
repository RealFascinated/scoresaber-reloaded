"use client";

import { OverlayDataClients } from "@/common/overlay/data-client";
import BeatSaberPlusClient from "@/common/overlay/impl/beatsaberplus";
import HTTPSiraStatusClient from "@/common/overlay/impl/httpsirastatus";
import { useOverlayDataStore } from "@/common/overlay/overlay-data-store";
import { OverlayRuntimeContext } from "@/common/overlay/overlay-runtime";
import {
  useOverlayBlPlayer,
  useOverlayPb,
  useOverlayPlayer,
  useOverlayRatings,
} from "@/common/overlay/use-overlay-queries";
import type { OverlayConnectionSettings } from "@ssr/common/schemas/overlay/overlay-connection-settings";
import { ReactNode, useEffect, useMemo } from "react";

type LiveOverlayRuntimeProps = {
  settings: OverlayConnectionSettings;
  /** Shows placeholders for widgets without data (the editor in live mode). */
  editing?: boolean;
  children: ReactNode;
};

/**
 * Feeds the widgets with the live data of the game, through the data client of the settings.
 */
export default function LiveOverlayRuntime({ settings, editing = false, children }: LiveOverlayRuntimeProps) {
  const data = useOverlayDataStore();
  const { player } = useOverlayPlayer(settings.playerId);
  const pb = useOverlayPb(settings.playerId, data);
  const blPlayer = useOverlayBlPlayer(settings.playerId);
  const ratings = useOverlayRatings(data);

  useEffect(() => {
    if (!settings.useRealTimeData) {
      return;
    }

    const client =
      settings.dataClient === OverlayDataClients.HTTPSiraStatus
        ? new HTTPSiraStatusClient()
        : new BeatSaberPlusClient();
    return () => client.disconnect();
  }, [settings.dataClient, settings.useRealTimeData]);

  const runtime = useMemo(
    () => ({ data, player, pb, blPlayer, ratings, editing }),
    [data, player, pb, blPlayer, ratings, editing]
  );
  return <OverlayRuntimeContext value={runtime}>{children}</OverlayRuntimeContext>;
}
