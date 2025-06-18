import ScoreSaberPlayer from "src/player/impl/scoresaber-player";

export type MiniRankingResponse = {
  /**
   * The players around the player.
   */
  players: ScoreSaberPlayer[];
};
