import { Cooldown } from "../../cooldown";
import Logger from "../../logger";
import { Page, Pagination } from "../../pagination";
import ApiService from "../api-service";
import { ApiServiceName } from "../api-service-registry";

const GQL_BASE = "https://gql.accsaber.com/graphql";
const SCORES_PER_PAGE = 8;

export type AccSaberScore = {
  id: string;
  playerId: string;
  leaderboardId: number;
  timeSet: Date;
  ap: number;
  acc: number;
  leaderboard: {
    leaderboardId: number;
    song: {
      hash: string;
      name: string;
      subName: string;
      author: string;
      mapper: string;
      beatsaverKey: string;
    };
    diffInfo: {
      type: string;
      diff: string;
    };
    complexity: number;
    category: string;
  };
  score: {
    ap: number;
    rank: number;
    unmodifiedScore: number;
    score: number;
    mods: null;
    timeSet: Date;
    acc: number;
    percentage: number;
    weightedAp: number;
  };
  fetchedAt: Date;
  lastUpdated: Date;
};

export type AccSaberScoreSort = "date" | "ap" | "acc" | "complexity" | "ranking";
export type AccSaberScoreOrder = "asc" | "desc";
export type AccSaberScoreType = "overall" | "true" | "tech" | "speed";

export class AccSaberService extends ApiService {
  constructor() {
    super(new Cooldown(60_000 / 300, 150), ApiServiceName.ACCSABER);
  }

  public async checkPlayerExists(playerId: string): Promise<boolean> {
    const query = `
      query FindPlayer($playerId: BigInt!) {
        playerDatum(playerId: $playerId) {
          playerId
        }
      }
    `;

    try {
      const result = await this.fetchGQL<{ data?: { playerDatum?: { playerId: string } } }>(
        GQL_BASE,
        query,
        {
          playerId: playerId,
        }
      );

      return !!result?.data?.playerDatum?.playerId;
    } catch (error) {
      return false;
    }
  }

  public async getPlayerScores(
    playerId: string,
    page: number = 1,
    options: {
      sort?: AccSaberScoreSort;
      order?: AccSaberScoreOrder;
      type?: AccSaberScoreType;
    } = {}
  ): Promise<Page<AccSaberScore>> {
    const { sort = "date", order = "desc", type = "overall" } = options;
    if (page < 1) page = 1;

    // Automatically generate sort options based on consistent naming pattern
    const generateSortOption = (sort: AccSaberScoreSort, order: AccSaberScoreOrder): string => {
      const sortMapping: Record<AccSaberScoreSort, string> = {
        date: "TIME_SET",
        acc: "ACCURACY",
        ap: "AP",
        complexity: "COMPLEXITY",
        ranking: "RANKING",
      };
      const base = sortMapping[sort];
      const direction = order.toUpperCase();
      return `${base}_${direction}`;
    };

    const query = `
      query GetPlayerScores(
        $playerId: BigInt, 
        ${type !== "overall" ? "$category: String," : ""}
        $offset: Int, 
        $count: Int, 
        $order: [AccSaberScoresOrderBy!]
      ) {
        accSaberScores(
          condition: { 
            playerId: $playerId
            ${type !== "overall" ? ", categoryName: $category" : ""}
          },
          orderBy: $order,
          offset: $offset,
          first: $count
        ) {
          nodes {
            songHash
            songName
            songAuthorName
            levelAuthorName
            complexity
            ranking
            categoryDisplayName
            difficulty
            timeSet
            leaderboardId
            accuracy
            ap
            weightedAp
            score
            beatSaverKey
            categoryName
          }
          totalCount
        }
      }
    `;

    try {
      const result = await this.fetchGQL<{
        data?: {
          accSaberScores: {
            nodes: Array<{
              songHash: string;
              songName: string;
              songAuthorName: string;
              levelAuthorName: string;
              complexity: number;
              ranking: string;
              categoryDisplayName: string;
              difficulty: string;
              timeSet: string;
              leaderboardId: string;
              accuracy: number;
              ap: number;
              weightedAp: number;
              score: number;
              beatSaverKey: string;
              categoryName: string;
            }>;
            totalCount: number;
          };
        };
      }>(GQL_BASE, query, {
        playerId,
        ...(type !== "overall" ? { category: type } : {}),
        count: SCORES_PER_PAGE,
        offset: SCORES_PER_PAGE * (page - 1),
        order: [generateSortOption(sort, order)],
      });

      if (!result?.data?.accSaberScores?.nodes?.length) {
        return Pagination.empty<AccSaberScore>();
      }

      const scores = result.data.accSaberScores.nodes.map(score => {
        const acc = score.accuracy * 100;
        const leaderboardId = parseInt(score.leaderboardId, 10);

        return {
          id: `${playerId}-${score.leaderboardId}`,
          playerId,
          leaderboardId,
          timeSet: new Date(score.timeSet),
          ap: score.ap,
          acc,
          leaderboard: {
            leaderboardId,
            song: {
              hash: score.songHash,
              name: score.songName,
              subName: "",
              author: score.songAuthorName,
              mapper: score.levelAuthorName,
              beatsaverKey: score.beatSaverKey,
            },
            diffInfo: {
              type: "Standard",
              diff: score.difficulty?.toLowerCase()?.replace("plus", "Plus"),
            },
            complexity: score.complexity,
            category: score.categoryName,
          },
          score: {
            ap: score.ap,
            rank: parseInt(score.ranking),
            unmodifiedScore: score.score,
            score: score.score,
            mods: null,
            timeSet: new Date(score.timeSet),
            acc,
            percentage: acc,
            weightedAp: score.weightedAp,
          },
          fetchedAt: new Date(),
          lastUpdated: new Date(),
        };
      });

      const totalItems = result.data.accSaberScores.totalCount;
      const totalPages = Math.ceil(totalItems / SCORES_PER_PAGE);

      return new Page(scores, {
        totalItems,
        itemsPerPage: SCORES_PER_PAGE,
        page,
        totalPages,
      });
    } catch (error) {
      Logger.error("Failed to fetch AccSaber scores: ", error);
      return Pagination.empty<AccSaberScore>();
    }
  }
}
