import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { PlayerModel } from "@ssr/common/model/player/player";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankingsResponse } from "@ssr/common/response/player-rankings-response";
import { Metadata } from "@ssr/common/types/metadata";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import ScoreSaberService from "../scoresaber.service";

export class PlayerSearchService {
  /**
   * Searches for players by name.
   *
   * @param query the query to search for
   * @returns the players that match the query
   */
  public static async searchPlayers(query: string): Promise<ScoreSaberPlayer[]> {
    // Run ScoreSaber API call and database query in parallel
    const [scoreSaberResponse, foundPlayers] = await Promise.all([
      ApiServiceRegistry.getInstance().getScoreSaberService().searchPlayers(query),
      query.length > 0
        ? PlayerModel.find({
            name: { $regex: query, $options: "i" },
          })
            .select(["_id", "name"])
            .lean()
        : [],
    ]);

    const scoreSaberPlayerTokens = scoreSaberResponse?.players;

    // Merge their ids
    const playerIds = foundPlayers.map(player => player._id);
    playerIds.push(...(scoreSaberPlayerTokens?.map(token => token.id) ?? []));

    // Deduplicate the player ids
    const uniquePlayerIds = [...new Set(playerIds)];

    // Get players from ScoreSaber
    return (
      await Promise.all(
        uniquePlayerIds.map(id =>
          ScoreSaberService.getPlayer(
            id,
            DetailType.BASIC,
            scoreSaberPlayerTokens?.find(token => token.id === id),
            { setInactivesRank: false, setMedalsRank: false }
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1;
      if (!a.inactive && b.inactive) return -1;
      return a.rank - b.rank;
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
        ? ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .lookupPlayersByCountry(page, country, search)
        : ApiServiceRegistry.getInstance().getScoreSaberService().lookupPlayers(page, search),
      getPlayerCountryCounts(),
    ]);

    return {
      items: foundPlayers?.players ?? [],
      metadata: new Metadata(
        Math.ceil((foundPlayers?.metadata.total ?? 0) / (foundPlayers?.metadata.itemsPerPage ?? 0)),
        foundPlayers?.metadata.total ?? 0,
        page,
        foundPlayers?.metadata.itemsPerPage ?? 0
      ),
      countryMetadata: countryCounts,
    } as PlayerRankingsResponse;
  }
}
