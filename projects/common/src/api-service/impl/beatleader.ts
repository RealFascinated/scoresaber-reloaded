import { Cooldown } from "../../cooldown";
import { BeatLeaderPlayersTotalSchema } from "../../schemas/beatleader/tokens/players/page";
import { ScoreStatsToken } from "../../schemas/beatleader/tokens/score-stats/score-stats";
import {
  BeatLeaderPlayerScoresPageSchema,
  type BeatLeaderPlayerScoresPageToken,
} from "../../schemas/beatleader/tokens/score/page";
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

    const parsed = BeatLeaderPlayersTotalSchema.safeParse(response, { reportInput: true });
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
      thenSortBy?: string;
      thenOrder?: string;
      noSearchSort?: boolean;
      search?: string;
      diff?: string;
      mode?: string;
      requirements?: string;
      type?: string;
      hmd?: string;
      modifiers?: string;
      stars_from?: string;
      stars_to?: string;
      eventId?: string;
    }
  ): Promise<BeatLeaderPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up BeatLeader scores page ${page} for "${playerId}"...`);

    const o = options ?? {};
    const response = await this.fetch<unknown>(LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":playerId", playerId), {
      searchParams: {
        leaderboardContext: o.leaderboardContext ?? "general",
        page,
        sortBy: o.sortBy ?? "date",
        order: o.order ?? "desc",
        thenSortBy: o.thenSortBy ?? "",
        thenOrder: o.thenOrder ?? "",
        noSearchSort: o.noSearchSort ?? false,
        search: o.search ?? "",
        diff: o.diff ?? "",
        mode: o.mode ?? "",
        requirements: o.requirements ?? "",
        type: o.type ?? "",
        hmd: o.hmd ?? "",
        modifiers: o.modifiers ?? "",
        stars_from: o.stars_from ?? "",
        stars_to: o.stars_to ?? "",
        eventId: o.eventId ?? "",
        count: o.count ?? 100,
        includeIO: o.includeIO ?? true,
      },
    });
    if (response == undefined) {
      return undefined;
    }

    const parsed = BeatLeaderPlayerScoresPageSchema.safeParse(response, { reportInput: true });
    if (!parsed.success) {
      this.log(`Failed to parse BeatLeader scores page ${page} for "${playerId}": ${parsed.error.message}`);
      return undefined;
    }

    this.log(
      `Found BeatLeader scores page ${page} for "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return parsed.data;
  }
}
