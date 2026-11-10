import { OverlayDataClients } from "@/common/overlay/data-client";
import { OverlaySettingsSchema, type OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";
import { parseSchema } from "@ssr/common/schemas/parse";

export type { OverlaySettings } from "@ssr/common/schemas/overlay/overlay-settings";

export enum OverlayViews {
  ScoreInfo = "scoreInfo",
  PlayerInfo = "playerInfo",
  SongInfo = "songInfo",
}

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

export function encodeOverlaySettings(settings: OverlaySettings) {
  return Buffer.from(JSON.stringify(settings)).toString("base64");
}
