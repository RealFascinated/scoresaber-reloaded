import ScoreSaberPlayer from "src/player/impl/scoresaber-player";
import type { Page } from "../../../pagination";

export type PlayerMedalRankingsResponse = Page<ScoreSaberPlayer> & {
  countryMetadata: Record<string, number>;
};
