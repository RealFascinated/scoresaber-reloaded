import ScoreSaberPlayer from "src/player/impl/scoresaber-player";
import { Page } from "../../../pagination";

export type PlayerMedalRankingsResponse = Page<ScoreSaberPlayer> & {
  countryMetadata: Record<string, number>;
};
