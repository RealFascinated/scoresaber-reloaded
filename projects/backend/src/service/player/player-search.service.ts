import { PlayerModel } from "@ssr/common/model/player/player";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import ScoreSaberService from "../scoresaber.service";

export class PlayerSearchService {
  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  public static async searchPlayers(query?: string): Promise<ScoreSaberPlayer[]> {
    const [scoreSaberResponse, foundPlayers] = await Promise.all([
      ScoreSaberApiService.searchPlayers(query ?? ""),
      query && query.length > 0
        ? PlayerModel.find({
            name: { $regex: query, $options: "i" },
          })
            .select(["_id", "name"])
            .limit(20)
            .lean()
        : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;
    const uniquePlayerIds = [
      ...new Set(
        foundPlayers
          .map(player => player._id)
          .concat(scoreSaberPlayerTokens?.map(token => token.id) ?? [])
      ),
    ];

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(async id =>
          ScoreSaberService.getPlayer(
            id,
            "basic",
            scoreSaberPlayerTokens?.find(token => token.id === id) ||
              (await ScoreSaberService.getCachedPlayer(id)) // Use the cache for inactive players
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1; // Inactive players should be at the bottom
      if (!a.inactive && b.inactive) return -1; // Active players should be at the top
      return a.rank - b.rank; // Sort by rank ascending
    });
  }

  /**
   * Gets a player ranking.
   *
   * @param page the page to get
   * @param options the options to get the player ranking
   * @returns the player ranking
   */
  public static async getPlayerRanking(
    page: number,
    options?: {
      country?: string;
      search?: string;
    }
  ): Promise<PlayerRankingsResponse> {
    const { country, search } = options ?? {};
    if (search && search.length < 3) {
      return {
        ...Pagination.empty<ScoreSaberPlayerToken>(),
        countryMetadata: {},
      } as PlayerRankingsResponse;
    }

    /**
     * Gets the amount of players in each country.
     *
     * @returns the amount of players in each country
     */
    async function getPlayerCountryCounts() {
      const counts = await PlayerModel.aggregate([
        {
          $match: {
            inactive: false,
            country: { $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: "$country",
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]);

      return counts.reduce(
        (acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    const [foundPlayers, countryCounts] = await Promise.all([
      country
        ? ScoreSaberApiService.lookupPlayersByCountry(page, country, search)
        : ScoreSaberApiService.lookupPlayers(page, search),
      getPlayerCountryCounts(),
    ]);

    return {
      items: foundPlayers?.players ?? [],
      metadata: {
        totalPages: Math.ceil(
          (foundPlayers?.metadata.total ?? 0) / (foundPlayers?.metadata.itemsPerPage ?? 0)
        ),
        totalItems: foundPlayers?.metadata.total ?? 0,
        page,
        itemsPerPage: foundPlayers?.metadata.itemsPerPage ?? 0,
      },
      countryMetadata: countryCounts,
    } as PlayerRankingsResponse;
  }
}
