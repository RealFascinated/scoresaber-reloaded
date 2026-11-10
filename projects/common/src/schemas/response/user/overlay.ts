import { Type, type StaticDecode } from "typebox";
import { OverlayConnectionSettingsSchema } from "../../overlay/overlay-connection-settings";
import { OverlayLayoutSchema } from "../../overlay/overlay-layout";

export const MAX_USER_OVERLAYS = 20;

const OverlayNameSchema = Type.String({ minLength: 1, maxLength: 64 });

export const OverlayIdParamsSchema = Type.Object({ id: Type.String({ format: "uuid" }) });

export const UserOverlaySummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  /** Epoch ms of the last change. */
  updatedAt: Type.Number(),
});
export type UserOverlaySummary = StaticDecode<typeof UserOverlaySummarySchema>;

export const UserOverlayListResponseSchema = Type.Object({ items: Type.Array(UserOverlaySummarySchema) });
export type UserOverlayListResponse = StaticDecode<typeof UserOverlayListResponseSchema>;

/** What the overlay page needs to render an overlay. `revision` is the epoch ms of the last change. */
export const OverlayContentSchema = Type.Object({
  revision: Type.Number(),
  settings: OverlayConnectionSettingsSchema,
  layout: OverlayLayoutSchema,
});
export type OverlayContent = StaticDecode<typeof OverlayContentSchema>;

export const UserOverlaySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  revision: Type.Number(),
  settings: OverlayConnectionSettingsSchema,
  layout: OverlayLayoutSchema,
});
export type UserOverlay = StaticDecode<typeof UserOverlaySchema>;

export const CreateUserOverlayBodySchema = Type.Object({
  name: OverlayNameSchema,
  /** A preset id to start from, a blank overlay when omitted. */
  presetId: Type.Optional(Type.String({ maxLength: 64 })),
});
export type CreateUserOverlayBody = StaticDecode<typeof CreateUserOverlayBodySchema>;

export const UpdateUserOverlayBodySchema = Type.Object({
  name: Type.Optional(OverlayNameSchema),
  settings: Type.Optional(OverlayConnectionSettingsSchema),
  layout: Type.Optional(OverlayLayoutSchema),
});
export type UpdateUserOverlayBody = StaticDecode<typeof UpdateUserOverlayBodySchema>;
