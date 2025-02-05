import { Cooldown } from "../../cooldown";
import { ScoreStatsToken } from "../../types/token/beatleader/score-stats/score-stats";
import Service from "../service";

const LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT = `https://cdn.scorestats.beatleader.xyz/:scoreId.json`;

class BeatLeaderService extends Service {
  constructor() {
    super(new Cooldown(60_000 / 300, 150));
  }

  /**
   * Looks up the score stats for a score
   *
   * @param scoreId the score id to get
   * @returns the score stats, or undefined if nothing was found
   */
  async lookupScoreStats(scoreId: number): Promise<ScoreStatsToken | undefined> {
    const before = performance.now();
    this.log(`Looking up scorestats for "${scoreId}"...`);

    const response = await this.fetch<ScoreStatsToken>(
      LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT.replace(":scoreId", scoreId + "")
    );
    // Score stats not found
    if (response == undefined) {
      return undefined;
    }

    this.log(
      `Found scorestats for score "${scoreId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }
}

export const beatLeaderService = new BeatLeaderService();
