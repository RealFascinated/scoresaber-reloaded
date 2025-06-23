import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { PlayerModel } from "@ssr/common/model/player";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
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
          }).select(["_id", "name"])
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
            scoreSaberPlayerTokens?.find(token => token.id === id)
          )
        )
      )
    ).sort((a, b) => {
      if (a.inactive && !b.inactive) return 1;
      if (!a.inactive && b.inactive) return -1;
      return a.rank - b.rank;
    });
  }

  // public static async getPlayerRanking(options?: { country?: string; search?: string }): Promise<{
  //   players: ScoreSaberPlayer[];
  //   metadata: Metadata;
  //   countryMetadata: Record<string, number>;
  // }> {
  //   const { country, search } = options ?? {};

  //   return {
  //     players: [],
  //     metadata: new Metadata(0, 0, 0, 0),
  //     countryMetadata: {},
  //   };
  // }
}
