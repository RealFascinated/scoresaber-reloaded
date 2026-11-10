import { Type, type StaticDecode } from "typebox";

export const OverlayViews = {
  ScoreInfo: "scoreInfo",
  PlayerInfo: "playerInfo",
  SongInfo: "songInfo",
} as const;

export const OverlayViewSchema = Type.Union([
  Type.Literal(OverlayViews.ScoreInfo),
  Type.Literal(OverlayViews.PlayerInfo),
  Type.Literal(OverlayViews.SongInfo),
]);
export type OverlayView = StaticDecode<typeof OverlayViewSchema>;
