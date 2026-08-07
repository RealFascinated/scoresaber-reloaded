import { Cooldown } from "../../cooldown";
import Logger from "../../logger";
import { Pagination } from "../../pagination";
import { type AccSaberScoreSort, type AccSaberScoreType } from "../../schemas/accsaber/query/query";
import { type ScoreResponse } from "../../schemas/accsaber/score/score";
import { type ScorePageResponse } from "../../schemas/accsaber/score/scores-page";
import type { AccSaberScoresPageResponse } from "../../schemas/response/score/accsaber-scores-page";
import { SortDirection } from "../../schemas/score/query/sort/sort-direction";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const API_BASE = "https://api.accsaber.com/v1";
const USER_ENDPOINT = `${API_BASE}/users/:playerId`;
const USER_SCORES_ENDPOINT = `${API_BASE}/users/:playerId/scores`;
const SCORES_PER_PAGE = 8;

/** Maps the app-level sort option to the `ScoreResponse` field the REST API sorts by. */
const SORT_FIELD: Record<AccSaberScoreSort, string> = {
  date: "timeSet",
  ap: "ap",
  acc: "accuracy",
  complexity: "complexity",
  ranking: "rank",
};

/** Maps the app-level score type to the AccSaber category code. */
const CATEGORY_CODE: Record<AccSaberScoreType, string> = {
  overall: "overall",
  true: "true_acc",
  tech: "tech_acc",
  standard: "standard_acc",
};

export class AccSaberService extends ApiService {
  constructor() {
    // 300 requests per minute
    super(new Cooldown(60_000 / 300, 150), ApiServiceName.ACCSABER, {
      useProxy: true,
      proxySwitchThreshold: 10,
      proxyResetThreshold: 100,
    });
  }

  /**
   * Checks whether a player exists on AccSaber.
   *
   * @param playerId the AccSaber user id
   * @returns true if the player exists
   */
  public async checkPlayerExists(playerId: string): Promise<boolean> {
    try {
      const user = await this.fetch(USER_ENDPOINT.replace(":playerId", playerId));
      return user !== undefined;
    } catch (error) {
      Logger.error("Failed to check AccSaber player existence: ", error);
      return false;
    }
  }

  /**
   * Gets a page of the player's AccSaber scores.
   *
   * @param playerId the AccSaber user id
   * @param page the 1-indexed page number
   * @param options the sort, direction and score type
   * @returns the scores page
   */
  public async getPlayerScores(
    playerId: string,
    page: number = 1,
    options: {
      sort?: AccSaberScoreSort;
      direction?: SortDirection;
      type?: AccSaberScoreType;
    } = {}
  ): Promise<AccSaberScoresPageResponse> {
    const { sort = "date", direction = "desc", type = "overall" } = options;
    const safePage = page < 1 ? 1 : page;

    const searchParams = new URLSearchParams({
      page: String(safePage - 1), // REST pages are 0-indexed
      size: String(SCORES_PER_PAGE),
      sort: `${SORT_FIELD[sort]},${direction}`,
    });
    // The scores endpoint defaults to the overall category when no categoryId is given
    // ("overall" is not a resolvable category id).
    if (type !== "overall") {
      searchParams.set("categoryId", CATEGORY_CODE[type]);
    }
    const url = `${USER_SCORES_ENDPOINT.replace(":playerId", playerId)}?${searchParams.toString()}`;

    const before = performance.now();
    this.log(`Fetching AccSaber scores for "${playerId}" (page ${safePage})...`);

    try {
      const result = await this.fetch<ScorePageResponse>(url);
      if (result === undefined || result.content.length === 0) {
        return Pagination.empty<ScoreResponse>();
      }

      this.log(
        `Found ${result.totalElements} AccSaber scores in ${(performance.now() - before).toFixed(0)}ms`
      );

      return {
        items: result.content,
        metadata: {
          totalItems: result.totalElements,
          totalPages: result.totalPages,
          page: result.number + 1,
          itemsPerPage: result.size,
        },
      };
    } catch (error) {
      Logger.error("Failed to fetch AccSaber scores: ", error);
      return Pagination.empty<ScoreResponse>();
    }
  }
}
