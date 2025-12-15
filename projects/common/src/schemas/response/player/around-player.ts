import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";

export type MiniRankingResponse = {
  /**
   * The global rankings of the player.
   */
  globalRankings: ScoreSaberPlayer[];

  /**
   * The country rankings of the player.
   */
  countryRankings: ScoreSaberPlayer[];
};
