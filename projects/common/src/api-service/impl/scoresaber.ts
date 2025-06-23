import { Cooldown, CooldownPriority } from "../../cooldown";
import { CurvePoint } from "../../curve-point";
import { DetailType } from "../../detail-type";
import { StarFilter } from "../../maps/types";
import ScoreSaberRankingRequestsResponse from "../../response/scoresaber-ranking-requests-response";
import { MapDifficulty } from "../../score/map-difficulty";
import { ScoreSaberScoreSort } from "../../score/score-sort";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/leaderboard";
import ScoreSaberLeaderboardPageToken from "../../types/token/scoresaber/leaderboard-page";
import ScoreSaberLeaderboardScoresPageToken from "../../types/token/scoresaber/leaderboard-scores-page";
import { ScoreSaberPlayerToken } from "../../types/token/scoresaber/player";
import ScoreSaberPlayerScoresPageToken from "../../types/token/scoresaber/player-scores-page";
import { ScoreSaberPlayerSearchToken } from "../../types/token/scoresaber/player-search";
import { ScoreSaberPlayersPageToken } from "../../types/token/scoresaber/players-page";
import RankingRequestToken from "../../types/token/scoresaber/ranking-request-token";
import { clamp, lerp } from "../../utils/math-utils";
import { getDifficulty } from "../../utils/song-utils";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const API_BASE = "https://scoresaber.com/api";

/**
 * Player
 */
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/:type`;
const LOOKUP_PLAYERS_ENDPOINT = `${API_BASE}/players?page=:page`;
const LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT = `${API_BASE}/players?page=:page&countries=:country`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;
const LOOKUP_ACTIVE_PLAYER_COUNT = `${API_BASE}/players/count`;

/**
 * Leaderboard
 */
const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT = `${API_BASE}/leaderboard/by-hash/:query/info?difficulty=:difficulty&gameMode=:gameMode`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;
const LOOKUP_LEADERBOARDS_ENDPOINT = `${API_BASE}/leaderboards`;
const SEARCH_LEADERBOARDS_ENDPOINT = `${API_BASE}/leaderboards?search=:query`;

/**
 * Ranking Queue
 */
const RANKING_REQUESTS_ENDPOINT = `${API_BASE}/ranking/requests/:query`;

export class ScoreSaberService extends ApiService {
  readonly WEIGHT_COEFFICIENT = 0.965;
  readonly STAR_MULTIPLIER = 42.117208413;

  private curvePoints = [
    new CurvePoint(0, 0),
    new CurvePoint(0.6, 0.18223233667439062),
    new CurvePoint(0.65, 0.5866010012767576),
    new CurvePoint(0.7, 0.6125565959114954),
    new CurvePoint(0.75, 0.6451808210101443),
    new CurvePoint(0.8, 0.6872268862950283),
    new CurvePoint(0.825, 0.7150465663454271),
    new CurvePoint(0.85, 0.7462290664143185),
    new CurvePoint(0.875, 0.7816934560296046),
    new CurvePoint(0.9, 0.825756123560842),
    new CurvePoint(0.91, 0.8488375988124467),
    new CurvePoint(0.92, 0.8728710341448851),
    new CurvePoint(0.93, 0.9039994071865736),
    new CurvePoint(0.94, 0.9417362980580238),
    new CurvePoint(0.95, 1),
    new CurvePoint(0.955, 1.0388633331418984),
    new CurvePoint(0.96, 1.0871883573850478),
    new CurvePoint(0.965, 1.1552120359501035),
    new CurvePoint(0.97, 1.2485807759957321),
    new CurvePoint(0.9725, 1.3090333065057616),
    new CurvePoint(0.975, 1.3807102743105126),
    new CurvePoint(0.9775, 1.4664726399289512),
    new CurvePoint(0.98, 1.5702410055532239),
    new CurvePoint(0.9825, 1.697536248647543),
    new CurvePoint(0.985, 1.8563887693647105),
    new CurvePoint(0.9875, 2.058947159052738),
    new CurvePoint(0.99, 2.324506282149922),
    new CurvePoint(0.99125, 2.4902905794106913),
    new CurvePoint(0.9925, 2.685667856592722),
    new CurvePoint(0.99375, 2.9190155639254955),
    new CurvePoint(0.995, 3.2022017597337955),
    new CurvePoint(0.99625, 3.5526145337555373),
    new CurvePoint(0.9975, 3.996793606763322),
    new CurvePoint(0.99825, 4.325027383589547),
    new CurvePoint(0.999, 4.715470646416203),
    new CurvePoint(0.9995, 5.019543595874787),
    new CurvePoint(1, 5.367394282890631),
  ];

  constructor() {
    super(new Cooldown(60_000 / 300, 150), ApiServiceName.SCORE_SABER);
  }

  /**
   * Gets the players that match the query.
   *
   * @param query the query to search for
   * @returns the players that match the query, or undefined if no players were found
   */
  public async searchPlayers(query: string): Promise<ScoreSaberPlayerSearchToken | undefined> {
    const before = performance.now();
    this.log(`Searching for players matching "${query}"...`);
    const results = await this.fetch<ScoreSaberPlayerSearchToken>(
      SEARCH_PLAYERS_ENDPOINT.replace(":query", query)
    );
    if (results === undefined) {
      return undefined;
    }
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    this.log(
      `Found ${results.players.length} players in ${(performance.now() - before).toFixed(0)}ms`
    );
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param type the data type to return
   * @returns the player that matches the ID, or undefined
   */
  public async lookupPlayer(
    playerId: string,
    type: DetailType = DetailType.FULL
  ): Promise<ScoreSaberPlayerToken | undefined> {
    const before = performance.now();
    this.log(`Looking up player "${playerId}"...`);
    const token = await this.fetch<ScoreSaberPlayerToken>(
      LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId).replace(":type", type)
    );
    if (token === undefined) {
      return undefined;
    }
    this.log(`Found player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`);
    return token;
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayers(
    page: number,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_ENDPOINT.replace(":page", page.toString()) +
        (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Lookup players on a specific page and country
   *
   * @param page the page to get players for
   * @param country the country to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayersByCountry(
    page: number,
    country: string,
    search?: string
  ): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}" for country "${country}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT.replace(":page", page.toString()).replace(
        ":country",
        country
      ) + (search ? `&search=${search}` : "")
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Gets the active player count.
   *
   * @returns the active player count
   */
  public async lookupActivePlayerCount(): Promise<number | undefined> {
    const before = performance.now();
    this.log(`Looking up active player count...`);
    const response = await this.fetch<number>(LOOKUP_ACTIVE_PLAYER_COUNT);
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found active player count in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param limit the amount of sores to fetch
   * @param page the page to get scores for
   * @param search the query to search for
   * @returns the scores of the player, or undefined
   */
  public async lookupPlayerScores({
    playerId,
    sort,
    limit = 8,
    page,
    search,
    priority = CooldownPriority.NORMAL,
  }: {
    playerId: string;
    sort: ScoreSaberScoreSort;
    limit?: number;
    page: number;
    search?: string;
    priority?: CooldownPriority;
  }): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`
    );
    const response = await this.fetch<ScoreSaberPlayerScoresPageToken>(
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", limit + "")
        .replace(":sort", sort)
        .replace(":page", page + "") + (search ? `&search=${search}` : ""),
      {
        priority,
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.playerScores.length} scores for player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Looks up a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   */
  public async lookupLeaderboard(
    leaderboardId: string | number,
    options?: {
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_ENDPOINT.replace(":id", leaderboardId.toString()),
      {
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Looks up a leaderboard by its hash
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param gameMode the game mode to get
   */
  public async lookupLeaderboardByHash(
    hash: string,
    difficulty: MapDifficulty,
    gameMode: string
  ): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}"...`
    );
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_BY_HASH_ENDPOINT.replace(":query", hash)
        .replace(":difficulty", getDifficulty(difficulty).id + "")
        .replace(":gameMode", gameMode)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found leaderboard by hash for "${hash}", difficulty "${difficulty}", gamemode "${gameMode}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Looks up a page of leaderboards
   *
   * @param page the page to look up
   * @param options the options to use when looking up the leaderboards
   */
  public async lookupLeaderboards(
    page: number,
    options?: {
      ranked?: boolean;
      qualified?: boolean;
      verified?: boolean;
      category?: number;
      stars?: StarFilter;
      sort?: number;
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard page "${page}"...`);

    const response = await this.fetch<ScoreSaberLeaderboardPageToken>(
      LOOKUP_LEADERBOARDS_ENDPOINT,
      {
        searchParams: {
          page: page.toString(),
          ...(options?.ranked ? { ranked: options.ranked } : {}),
          ...(options?.qualified ? { qualified: options.qualified } : {}),
          ...(options?.verified ? { verified: options.verified } : {}),
          ...(options?.category ? { category: options.category } : {}),
          ...(options?.stars
            ? { minStar: options.stars.min ?? 0, maxStar: options.stars.max }
            : {}),
          ...(options?.sort ? { sort: options.sort } : {}),
        },
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.leaderboards.length} leaderboards in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Searches for leaderboards
   *
   * @param query the query to search for
   */
  public async searchLeaderboards(
    query: string
  ): Promise<ScoreSaberLeaderboardPageToken | undefined> {
    const before = performance.now();
    this.log(`Searching for leaderboards matching "${query}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardPageToken>(
      SEARCH_LEADERBOARDS_ENDPOINT.replace(":query", query)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.leaderboards.length} leaderboards in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Looks up a page of scores for a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param page the page to get scores for
   * @param country the country to get scores in
   * @returns the scores of the leaderboard, or undefined
   */
  public async lookupLeaderboardScores(
    leaderboardId: string | number,
    page: number,
    options?: {
      country?: string;
      priority?: CooldownPriority;
    }
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardScoresPageToken>(
      LOOKUP_LEADERBOARD_SCORES_ENDPOINT.replace(":id", leaderboardId.toString()).replace(
        ":page",
        page.toString()
      ) + (options?.country ? `&countries=${options.country}` : ""),
      {
        ...(options?.priority ? { priority: options.priority } : {}),
      }
    );

    if (response === undefined) {
      return undefined;
    }

    this.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}", page "${page}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
  }

  /**
   * Gets the ranking requests.
   *
   * @returns the ranking requests
   */
  public async lookupRankingRequests(): Promise<ScoreSaberRankingRequestsResponse | undefined> {
    const before = performance.now();
    this.log(`Looking up ranking requests...`);

    const nextInQueueResponse = await this.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "top")
    );
    const openRankUnrankResponse = await this.fetch<RankingRequestToken[]>(
      RANKING_REQUESTS_ENDPOINT.replace(":query", "belowTop")
    );

    const response = nextInQueueResponse?.concat(openRankUnrankResponse || []);
    if (response === undefined) {
      return undefined;
    }

    this.log(
      `Found ${response.length} ranking requests in ${(performance.now() - before).toFixed(0)}ms`
    );
    return {
      nextInQueue: nextInQueueResponse || [],
      openRankUnrank: openRankUnrankResponse || [],
      all: response || [],
    };
  }

  /**
   * Gets the modifier for the given accuracy.
   *
   * @param accuracy The accuracy.
   * @return The modifier.
   */
  public getModifier(accuracy: number): number {
    accuracy = clamp(accuracy, 0, 100) / 100; // Normalize accuracy to a range of [0, 1]

    if (accuracy <= 0) {
      return 0;
    }

    if (accuracy >= 1) {
      return this.curvePoints[this.curvePoints.length - 1].getMultiplier();
    }

    for (let i = 0; i < this.curvePoints.length - 1; i++) {
      const point = this.curvePoints[i];
      const nextPoint = this.curvePoints[i + 1];
      if (accuracy >= point.getAcc() && accuracy <= nextPoint.getAcc()) {
        return lerp(
          point.getMultiplier(),
          nextPoint.getMultiplier(),
          (accuracy - point.getAcc()) / (nextPoint.getAcc() - point.getAcc())
        );
      }
    }

    return 0;
  }

  /**
   * Gets the performance points (PP) based on stars and accuracy.
   *
   * @param stars The star count.
   * @param accuracy The accuracy.
   * @returns The calculated PP.
   */
  public getPp(stars: number, accuracy: number): number {
    if (accuracy <= 1) {
      accuracy *= 100; // Convert the accuracy to a percentage
    }
    const pp = stars * this.STAR_MULTIPLIER; // Calculate base PP value
    return this.getModifier(accuracy) * pp; // Calculate and return final PP value
  }

  /**
   * Ngl i have no idea what this does.
   *
   * @param bottomScores
   * @param idx
   * @param expected
   * @private
   */
  private calcRawPpAtIdx(bottomScores: Array<any>, idx: number, expected: number) {
    const oldBottomPp = this.getTotalWeightedPp(bottomScores, idx);
    const newBottomPp = this.getTotalWeightedPp(bottomScores, idx + 1);

    // 0.965^idx * rawPpToFind = expected + oldBottomPp - newBottomPp;
    // rawPpToFind = (expected + oldBottomPp - newBottomPp) / 0.965^idx;
    return (expected + oldBottomPp - newBottomPp) / Math.pow(this.WEIGHT_COEFFICIENT, idx);
  }

  /**
   * Gets the total amount of weighted pp from
   * the sorted pp array
   *
   * @param ppArray the sorted pp array
   * @param startIdx the index to start from
   * @returns the total amount of weighted pp
   * @private
   */
  public getTotalWeightedPp(ppArray: Array<number>, startIdx = 0) {
    return ppArray.reduce(
      (cumulative, pp, idx) => cumulative + Math.pow(this.WEIGHT_COEFFICIENT, idx + startIdx) * pp,
      0
    );
  }

  /**
   * Gets the amount of raw pp you need
   * to gain the expected pp
   *
   * @param scoresPps the sorted pp array
   * @param expectedPp the expected pp gain
   * @returns the amount of raw pp
   */
  public calcPpBoundary(scoresPps: number[], expectedPp = 1) {
    let left = 0;
    let right = scoresPps.length - 1;
    let boundaryIdx = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const bottomSlice = scoresPps.slice(mid);
      const bottomPp = this.getTotalWeightedPp(bottomSlice, mid);

      bottomSlice.unshift(scoresPps[mid]);
      const modifiedBottomPp = this.getTotalWeightedPp(bottomSlice, mid);
      const diff = modifiedBottomPp - bottomPp;

      if (diff > expectedPp) {
        boundaryIdx = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return boundaryIdx === -1
      ? this.calcRawPpAtIdx(scoresPps, 0, expectedPp)
      : this.calcRawPpAtIdx(scoresPps.slice(boundaryIdx + 1), boundaryIdx + 1, expectedPp);
  }

  /**
   * Gets the boundary for a given raw PP value.
   *
   * @param scoresPps The sorted scores PP array.
   * @param rawPp The raw PP value to evaluate.
   * @returns The PP boundary corresponding to the given raw PP.
   */
  public getPpBoundaryForRawPp(scoresPps: number[], rawPp: number): number {
    // If there are no existing scores, the boundary is just the raw PP
    if (!scoresPps.length) {
      return rawPp;
    }

    // Create a copy of scores and find where the new PP would fit
    const newScores = [...scoresPps];
    let insertIndex = newScores.findIndex(pp => rawPp > pp);

    // If the new PP is smaller than all existing scores, add it to the end
    if (insertIndex === -1) {
      insertIndex = newScores.length;
    }

    // Insert the new PP value at the correct position
    newScores.splice(insertIndex, 0, rawPp);

    // Calculate the total weighted PP before and after insertion
    const oldTotal = this.getTotalWeightedPp(scoresPps);
    const newTotal = this.getTotalWeightedPp(newScores);

    // The boundary is the difference between the new and old totals
    return newTotal - oldTotal;
  }
}
