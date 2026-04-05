import type { Page } from "../../../pagination";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";

export type PlayerRankingsResponse = Page<ScoreSaberPlayer> & {
  countryMetadata: Record<string, number>;
};
