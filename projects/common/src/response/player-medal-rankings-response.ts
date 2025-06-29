import { Page } from "../pagination";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";

export type PlayerMedalRankingsResponse = Page<ScoreSaberPlayer> & {
  countryMetadata: Record<string, number>;
};
