import { Page } from "../pagination";
import { ScoreSaberPlayerToken } from "../types/token/scoresaber/player";

export type PlayerRankingsResponse = Page<ScoreSaberPlayerToken> & {
  countryMetadata: Record<string, number>;
};
