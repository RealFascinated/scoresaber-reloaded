import { Type, type StaticDecode } from "typebox";

export const OverlayAnchors = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

export const OverlayAnchorSchema = Type.Union([
  Type.Literal("top-left"),
  Type.Literal("top"),
  Type.Literal("top-right"),
  Type.Literal("left"),
  Type.Literal("center"),
  Type.Literal("right"),
  Type.Literal("bottom-left"),
  Type.Literal("bottom"),
  Type.Literal("bottom-right"),
]);
export type OverlayAnchor = StaticDecode<typeof OverlayAnchorSchema>;
