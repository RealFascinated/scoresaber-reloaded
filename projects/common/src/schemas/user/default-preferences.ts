import { HistoryMode } from "./history-mode";
import type { UserPreferences } from "./preferences";
import { WebsiteLanding } from "./website-landing";

/**
 * Kept apart from `preferences.ts` (which builds the TypeBox schemas) so the website can read the
 * defaults without bundling TypeBox into every page.
 */

export const BACKGROUND_COVER_NONE = "none";
export const BACKGROUND_COVER_CUSTOM = "custom";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showKitty: false,
  snowParticles: false,
  whatIfRange: [90, 98.5],
  plusPpDefaultAccuracy: 95,
  historyMode: HistoryMode.ADVANCED,
  replayViewer: "chroviewer",
  websiteLanding: WebsiteLanding.PLAYER_HOME,
  defaultLeaderboardCountry: null,
  chartLegends: {},
  backgroundCover: BACKGROUND_COVER_NONE,
  customBackground: "",
  backgroundCoverBrightness: 50,
  backgroundCoverBlur: 6,
};
