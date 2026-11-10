import { Type, type StaticDecode } from "typebox";
import { OverlayElementSchema } from "./overlay-element";

/** The fixed design canvas every overlay is laid out on. */
export const OVERLAY_CANVAS_WIDTH = 1920;
export const OVERLAY_CANVAS_HEIGHT = 1080;
export const MAX_OVERLAY_ELEMENTS = 100;

export const OverlayLayoutSchema = Type.Object(
  {
    version: Type.Literal(1),
    canvas: Type.Object(
      { w: Type.Literal(OVERLAY_CANVAS_WIDTH), h: Type.Literal(OVERLAY_CANVAS_HEIGHT) },
      { additionalProperties: false }
    ),
    elements: Type.Array(OverlayElementSchema, { maxItems: MAX_OVERLAY_ELEMENTS }),
  },
  { additionalProperties: false }
);
export type OverlayLayout = StaticDecode<typeof OverlayLayoutSchema>;
