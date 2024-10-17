import Service from "../service";
import { ScoreSaberPlayerSearchToken } from "../../types/token/scoresaber/score-saber-player-search-token";
import ScoreSaberPlayerToken from "../../types/token/scoresaber/score-saber-player-token";
import { ScoreSaberPlayersPageToken } from "../../types/token/scoresaber/score-saber-players-page-token";
import { ScoreSort } from "../../score/score-sort";
import ScoreSaberPlayerScoresPageToken from "../../types/token/scoresaber/score-saber-player-scores-page-token";
import ScoreSaberLeaderboardToken from "../../types/token/scoresaber/score-saber-leaderboard-token";
import ScoreSaberLeaderboardScoresPageToken from "../../types/token/scoresaber/score-saber-leaderboard-scores-page-token";
import { clamp, lerp } from "../../utils/math-utils";
import { CurvePoint } from "../../utils/curve-point";
import { SSRCache } from "../../cache";

const API_BASE = "https://scoresaber.com/api";

/**
 * Player
 */
const SEARCH_PLAYERS_ENDPOINT = `${API_BASE}/players?search=:query`;
const LOOKUP_PLAYER_ENDPOINT = `${API_BASE}/player/:id/full`;
const LOOKUP_PLAYERS_ENDPOINT = `${API_BASE}/players?page=:page`;
const LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT = `${API_BASE}/players?page=:page&countries=:country`;
const LOOKUP_PLAYER_SCORES_ENDPOINT = `${API_BASE}/player/:id/scores?limit=:limit&sort=:sort&page=:page`;

/**
 * Leaderboard
 */
const LOOKUP_LEADERBOARD_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/info`;
const LOOKUP_LEADERBOARD_SCORES_ENDPOINT = `${API_BASE}/leaderboard/by-id/:id/scores?page=:page`;

const STAR_MULTIPLIER = 42.117208413;

const playerCache = new SSRCache({
  ttl: 60 * 30, // 30 minutes
});

class ScoreSaberService extends Service {
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
    super("ScoreSaber");
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
    const results = await this.fetch<ScoreSaberPlayerSearchToken>(SEARCH_PLAYERS_ENDPOINT.replace(":query", query));
    if (results === undefined) {
      return undefined;
    }
    if (results.players.length === 0) {
      return undefined;
    }
    results.players.sort((a, b) => a.rank - b.rank);
    this.log(`Found ${results.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return results;
  }

  /**
   * Looks up a player by their ID.
   *
   * @param playerId the ID of the player to look up
   * @param cache whether to use the local cache
   * @returns the player that matches the ID, or undefined
   */
  public async lookupPlayer(playerId: string, cache: boolean = false): Promise<ScoreSaberPlayerToken | undefined> {
    if (cache && playerCache.has(playerId)) {
      return playerCache.get(playerId);
    }
    const before = performance.now();
    this.log(`Looking up player "${playerId}"...`);
    const token = await this.fetch<ScoreSaberPlayerToken>(LOOKUP_PLAYER_ENDPOINT.replace(":id", playerId));
    if (token === undefined) {
      return undefined;
    }
    this.log(`Found player "${playerId}" in ${(performance.now() - before).toFixed(0)}ms`);
    if (cache) {
      playerCache.set(playerId, token);
    }
    return token;
  }

  /**
   * Lookup players on a specific page
   *
   * @param page the page to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayers(page: number): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_ENDPOINT.replace(":page", page.toString())
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Lookup players on a specific page and country
   *
   * @param page the page to get players for
   * @param country the country to get players for
   * @returns the players on the page, or undefined
   */
  public async lookupPlayersByCountry(page: number, country: string): Promise<ScoreSaberPlayersPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up players on page "${page}" for country "${country}"...`);
    const response = await this.fetch<ScoreSaberPlayersPageToken>(
      LOOKUP_PLAYERS_BY_COUNTRY_ENDPOINT.replace(":page", page.toString()).replace(":country", country)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found ${response.players.length} players in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up a page of scores for a player
   *
   * @param playerId the ID of the player to look up
   * @param sort the sort to use
   * @param page the page to get scores for
   * @param search
   * @returns the scores of the player, or undefined
   */
  public async lookupPlayerScores({
    playerId,
    sort,
    page,
    search,
  }: {
    playerId: string;
    sort: ScoreSort;
    page: number;
    search?: string;
    useProxy?: boolean;
  }): Promise<ScoreSaberPlayerScoresPageToken | undefined> {
    const before = performance.now();
    this.log(
      `Looking up scores for player "${playerId}", sort "${sort}", page "${page}"${search ? `, search "${search}"` : ""}...`
    );
    const response = await this.fetch<ScoreSaberPlayerScoresPageToken>(
      LOOKUP_PLAYER_SCORES_ENDPOINT.replace(":id", playerId)
        .replace(":limit", 8 + "")
        .replace(":sort", sort)
        .replace(":page", page + "") + (search ? `&search=${search}` : "")
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
  public async lookupLeaderboard(leaderboardId: string): Promise<ScoreSaberLeaderboardToken | undefined> {
    const before = performance.now();
    this.log(`Looking up leaderboard "${leaderboardId}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardToken>(
      LOOKUP_LEADERBOARD_ENDPOINT.replace(":id", leaderboardId)
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(`Found leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`);
    return response;
  }

  /**
   * Looks up a page of scores for a leaderboard
   *
   * @param leaderboardId the ID of the leaderboard to look up
   * @param page the page to get scores for
   * @returns the scores of the leaderboard, or undefined
   */
  public async lookupLeaderboardScores(
    leaderboardId: string,
    page: number
  ): Promise<ScoreSaberLeaderboardScoresPageToken | undefined> {
    const before = performance.now();
    this.log(`Looking up scores for leaderboard "${leaderboardId}", page "${page}"...`);
    const response = await this.fetch<ScoreSaberLeaderboardScoresPageToken>(
      LOOKUP_LEADERBOARD_SCORES_ENDPOINT.replace(":id", leaderboardId).replace(":page", page.toString())
    );
    if (response === undefined) {
      return undefined;
    }
    this.log(
      `Found ${response.scores.length} scores for leaderboard "${leaderboardId}" in ${(performance.now() - before).toFixed(0)}ms`
    );
    return response;
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
    const pp = stars * STAR_MULTIPLIER; // Calculate base PP value
    return this.getModifier(accuracy) * pp; // Calculate and return final PP value
  }
}

export const scoresaberService = new ScoreSaberService();
