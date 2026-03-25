import { Cooldown } from "../../cooldown";
import { BeatLeaderPlayersTotalSchema } from "../../schemas/beatleader/tokens/players/page";
import {
  BeatLeaderPlayerScoresPageSchema,
  type BeatLeaderPlayerScoresPageToken,
} from "../../schemas/beatleader/tokens/score/page";
import { ScoreStatsToken } from "../../schemas/beatleader/tokens/score-stats/score-stats";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT = `https://cdn.scorestats.beatleader.xyz/:scoreId.json`;
const LOOKUP_PLAYERS_ENDPOINT =
  "https://api.beatleader.com/players?leaderboardContext=general&page=1&count=50&sortBy=pp&mapsType=ranked&ppType=general&order=desc";
const LOOKUP_PLAYER_SCORES_ENDPOINT = "https://api.beatleader.com/player/:playerId/scores";

export class BeatLeaderService extends ApiService {
  constructor() {
    // 300 requests per minute
    super(new Cooldown(60_000 / 300, 150), ApiServiceName.BEAT_LEADER, {
      useProxy: true,
      proxySwitchThreshold: 10,
      proxyResetThreshold: 100,
    });
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
      LOOKUP_MAP_STATS_BY_SCORE_ID_ENDPOINT.replace(":scoreId", scoreId.toString())
    );
    // Score stats not found
    if (response == undefined) {
      return undefined;
    }

    this.log(`Found scorestats for score "${scoreId}" in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up the total players count from BeatLeader.
   *
   * @returns total players count from players metadata, or undefined
   */
  async lookupPlayersTotal(): Promise<number | undefined> {
    const before = performance.now();
    this.log("Looking up BeatLeader players total...");

    const response = await this.fetch<unknown>(LOOKUP_PLAYERS_ENDPOINT);
    if (response == undefined) {
      return undefined;
    }

    const parsed = BeatLeaderPlayersTotalSchema.safeParse(response);
    if (!parsed.success) {
      return undefined;
    }

    this.log(`Found BeatLeader players total in ${(performance.now() - before).toFixed(0)}ms`);
    return parsed.data.metadata.total;
  }

  /**
   * Looks up a page of player scores from BeatLeader.
   *
   * @param playerId the id of the player
   * @param page the page number
   * @param options query options
   */
  async lookupPlayerScores(
    playerId: string,
    page: number,
    options?: {
      count?: number;
      sortBy?: "date";
      order?: "desc" | "asc";
      leaderboardContext?: "general";
      includeIO?: boolean;
    }
  ): Promise<BeatLeaderPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up BeatLeader scores page ${page} for "${playerId}"...`);

    const response = await this.fetch<unknown>(LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":playerId", playerId), {
      searchParams: {
        leaderboardContext: options?.leaderboardContext ?? "general",
        page,
        count: options?.count ?? 100,
        sortBy: options?.sortBy ?? "date",
        order: options?.order ?? "desc",
        includeIO: options?.includeIO ?? true,
      },
    });
    if (response == undefined) {
      return undefined;
    }

    const parsed = BeatLeaderPlayerScoresPageSchema.safeParse(response);
    if (!parsed.success) {
      return undefined;
    }

    this.log(
      `Found BeatLeader scores page ${page} for "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return parsed.data;
  }
}
