import { OverlayDataClients } from "@/common/overlay/data-client";
import { OverlaySettingsSchema, type OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";
import { OverlayViews } from "@ssr/common/schemas/overlay/overlay-view";
import { parseSchema } from "@ssr/common/schemas/parse";

export type { OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";
export { OverlayViews } from "@ssr/common/schemas/overlay/overlay-view";
export type { OverlayView } from "@ssr/common/schemas/overlay/overlay-view";

export const defaultOverlaySettings: OverlaySettings = {
  playerId: "",
  useRealTimeData: true,
  dataClient: OverlayDataClients.BeatSaberPlus,
  views: {
    [OverlayViews.ScoreInfo]: true,
    [OverlayViews.PlayerInfo]: true,
    [OverlayViews.SongInfo]: true,
  },
};

export function parseOverlaySettings(settingsBase64: string) {
  return parseSchema(OverlaySettingsSchema, {
    ...defaultOverlaySettings,
    ...JSON.parse(Buffer.from(settingsBase64, "base64").toString()),
  });
}
