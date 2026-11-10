import { Type, type StaticDecode } from "typebox";
import { OverlayAnchorSchema } from "./overlay-anchor";

/** Every kind of widget that can be placed on an overlay. */
export const OverlayWidgetTypes = {
  PlayerAvatar: "playerAvatar",
  PlayerName: "playerName",
  PlayerRank: "playerRank",
  PlayerCountryRank: "playerCountryRank",
  PlayerMedals: "playerMedals",
  PlayerPp: "playerPp",
  PlayerBlPp: "playerBlPp",
  SongCover: "songCover",
  SongInfo: "songInfo",
  ScoreAccuracy: "scoreAccuracy",
  ScoreCombo: "scoreCombo",
  ScoreScore: "scoreScore",
  ScorePp: "scorePp",
  ScoreBlPp: "scoreBlPp",
  PbDelta: "pbDelta",
  Text: "text",
} as const;
export type OverlayWidgetType = (typeof OverlayWidgetTypes)[keyof typeof OverlayWidgetTypes];

export const MIN_OVERLAY_SCALE = 0.1;
export const MAX_OVERLAY_SCALE = 5;
export const MAX_OVERLAY_TEXT_LENGTH = 200;

const NoOptionsSchema = Type.Object({}, { additionalProperties: false });

export const PbDeltaOptionsSchema = Type.Object(
  {
    /** `delta` shows the difference to the PB, `pbAccuracy` shows the PB's accuracy at this point. */
    mode: Type.Union([Type.Literal("delta"), Type.Literal("pbAccuracy")]),
    precision: Type.Integer({ minimum: 0, maximum: 3 }),
    showLabel: Type.Boolean(),
  },
  { additionalProperties: false }
);
export type PbDeltaOptions = StaticDecode<typeof PbDeltaOptionsSchema>;

export const PpOptionsSchema = Type.Object(
  {
    /** Shows which leaderboard the pp is from (SS or BL). Shown when missing. */
    showPlatform: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);
export type PpOptions = StaticDecode<typeof PpOptionsSchema>;

export const TextOptionsSchema = Type.Object(
  { text: Type.String({ maxLength: MAX_OVERLAY_TEXT_LENGTH }) },
  { additionalProperties: false }
);
export type TextOptions = StaticDecode<typeof TextOptionsSchema>;

const OverlayOffsetSchema = Type.Object(
  {
    /** Design px, measured inward from the anchor (signed from the centre line on centred axes). */
    x: Type.Number({ minimum: -4000, maximum: 4000 }),
    y: Type.Number({ minimum: -4000, maximum: 4000 }),
  },
  { additionalProperties: false }
);

const OverlaySizeValueSchema = Type.Union([Type.Literal("auto"), Type.Number({ minimum: 1, maximum: 4000 })]);

const OverlayElementBaseFields = {
  id: Type.String({ minLength: 1, maxLength: 64 }),
  visible: Type.Boolean(),
  locked: Type.Boolean(),
  z: Type.Integer({ minimum: 0, maximum: 10000 }),
  /** The canvas anchor point and the element's own pivot. */
  anchor: OverlayAnchorSchema,
  offset: OverlayOffsetSchema,
  /** Base (unscaled) size in design px. */
  size: Type.Object(
    { w: OverlaySizeValueSchema, h: OverlaySizeValueSchema },
    { additionalProperties: false }
  ),
  scale: Type.Number({ minimum: MIN_OVERLAY_SCALE, maximum: MAX_OVERLAY_SCALE }),
};

function elementSchema<
  T extends OverlayWidgetType,
  O extends typeof NoOptionsSchema | typeof PpOptionsSchema,
>(type: T, options: O) {
  return Type.Object(
    { ...OverlayElementBaseFields, type: Type.Literal(type), options },
    { additionalProperties: false }
  );
}

export const OverlayElementSchema = Type.Union([
  elementSchema(OverlayWidgetTypes.PlayerAvatar, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerName, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerRank, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerCountryRank, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerMedals, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerPp, PpOptionsSchema),
  elementSchema(OverlayWidgetTypes.PlayerBlPp, PpOptionsSchema),
  elementSchema(OverlayWidgetTypes.SongCover, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.SongInfo, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.ScoreAccuracy, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.ScoreCombo, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.ScoreScore, NoOptionsSchema),
  elementSchema(OverlayWidgetTypes.ScorePp, PpOptionsSchema),
  elementSchema(OverlayWidgetTypes.ScoreBlPp, PpOptionsSchema),
  Type.Object(
    {
      ...OverlayElementBaseFields,
      type: Type.Literal(OverlayWidgetTypes.PbDelta),
      options: PbDeltaOptionsSchema,
    },
    { additionalProperties: false }
  ),
  Type.Object(
    { ...OverlayElementBaseFields, type: Type.Literal(OverlayWidgetTypes.Text), options: TextOptionsSchema },
    { additionalProperties: false }
  ),
]);
export type OverlayElement = StaticDecode<typeof OverlayElementSchema>;
