import { Type, type StaticDecode } from "typebox";
import { ReplayViewerIdSchema } from "../replay-viewer/replay-viewer-id";
import { HistoryMode } from "./history-mode";
import { WebsiteLanding } from "./website-landing";

const HistoryModeSchema = Type.Enum(HistoryMode);
const WebsiteLandingSchema = Type.Enum(WebsiteLanding);

const AccuracySchema = Type.Number({ minimum: 0, maximum: 100 });

/**
 * The preferences of a signed-in user, stored on the server.
 */
export const UserPreferencesSchema = Type.Object(
  {
    showKitty: Type.Boolean(),
    snowParticles: Type.Boolean(),
    /** The accuracy range shown in the "what if" pp calculator. */
    whatIfRange: Type.Tuple([AccuracySchema, AccuracySchema]),
    plusPpDefaultAccuracy: AccuracySchema,
    historyMode: HistoryModeSchema,
    replayViewer: ReplayViewerIdSchema,
    websiteLanding: WebsiteLandingSchema,
    /** A 2 letter country code, or null for global. */
    defaultLeaderboardCountry: Type.Union([Type.String({ minLength: 2, maxLength: 2 }), Type.Null()]),
    /** Chart id -> legend title -> visible. */
    chartLegends: Type.Record(
      Type.String({ maxLength: 64 }),
      Type.Record(Type.String({ maxLength: 64 }), Type.Boolean())
    ),
    /** A preset id, "custom" or "none". */
    backgroundCover: Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z0-9-]+$" }),
    /** A hex color or an http(s) image url, used when the cover is "custom". */
    customBackground: Type.String({ maxLength: 2048, pattern: "^[^\"'()\\s]*$" }),
    backgroundCoverBrightness: Type.Number({ minimum: 20, maximum: 100 }),
    backgroundCoverBlur: Type.Number({ minimum: 0, maximum: 20 }),
  },
  { additionalProperties: false }
);
export type UserPreferences = StaticDecode<typeof UserPreferencesSchema>;
export type UserPreferenceKey = keyof UserPreferences;

/**
 * A partial update. Each given key replaces the stored value.
 */
export const UserPreferencesPatchSchema = Type.Partial(UserPreferencesSchema);
export type UserPreferencesPatch = StaticDecode<typeof UserPreferencesPatchSchema>;
