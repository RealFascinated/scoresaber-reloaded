import Logger from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberMedalScoresRepository } from "../../repositories/scoresaber-medal-scores.repository";
import ScoreSaberPlayerService from "./scoresaber-player.service";

export class PlayerMedalsService {
  /**
   * Updates the global medal count for all players.
   */
  public static async updatePlayerGlobalMedalCounts(): Promise<void> {
    const before = performance.now();

    const medalCountRows = await ScoreSaberMedalScoresRepository.sumMedalsGroupedByPlayerId();
    const playerMedalCounts = new Map(medalCountRows.map(row => [row.playerId, row.totalMedals]));

    await ScoreSaberAccountsRepository.syncGlobalMedalTotalsFromMap(playerMedalCounts);

    Logger.info(
      `[PLAYER MEDALS] Updated ${playerMedalCounts.size} player medal counts in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Updates the medal count for a list of players.
   *
   * @param playerIds the ids of the players
   * @returns a map of player id to medal count
   */
  public static async updatePlayerMedalCounts(...playerIds: string[]): Promise<Record<string, number>> {
    const before = performance.now();

    if (playerIds.length === 0) return {};

    const medalCounts = await ScoreSaberMedalScoresRepository.sumMedalsGroupedByPlayerIdIn(playerIds);
    const totalsByPlayer = new Map(medalCounts.map(({ playerId, totalMedals }) => [playerId, totalMedals]));

    await ScoreSaberAccountsRepository.setMedalsForPlayerIds(totalsByPlayer, playerIds);

    Logger.info(
      `[PLAYER MEDALS] Updated ${playerIds.length} player medal counts in ${formatDuration(performance.now() - before)}`
    );

    return Object.fromEntries(playerIds.map(id => [id, totalsByPlayer.get(id) ?? 0]));
  }

  /**
   * Gets the amount of medals a player has.
   *
   * @param playerId the id of the player
   * @returns the medal count
   */
  public static async getPlayerMedals(playerId: string): Promise<number> {
    return ScoreSaberAccountsRepository.getMedalsForPlayerId(playerId);
  }

  /**
   * Gets the player medal ranking for a page.
   *
   * @param page the page number
   * @param country optional country filter
   * @returns the players
   */
  public static async getPlayerMedalRanking(
    page: number,
    country?: string
  ): Promise<PlayerMedalRankingsResponse> {
    const itemsPerPage = 50;

    const [totalPlayers, countryMetadataRows] = await Promise.all([
      ScoreSaberAccountsRepository.countMedalRankingEligible(country),
      ScoreSaberAccountsRepository.selectMedalRankingCountryMetadata(country),
    ]);

    if (totalPlayers === 0) {
      return { ...Pagination.empty<ScoreSaberPlayer>(), countryMetadata: {} } as PlayerMedalRankingsResponse;
    }

    const pagination = new Pagination<ScoreSaberPlayer>()
      .setItemsPerPage(itemsPerPage)
      .setTotalItems(totalPlayers);

    const pageData = await pagination.getPage(page, async fetchRange => {
      const players = await ScoreSaberAccountsRepository.selectMedalRankingPage(
        country,
        fetchRange.start,
        fetchRange.end - fetchRange.start
      );

      if (!players.length) return [];

      const playerIds = players.map(p => p.id);
      const [globalRankMap, countryRankMap] = await Promise.all([
        ScoreSaberAccountsRepository.getMedalRanksForIds(playerIds, { country }),
        ScoreSaberAccountsRepository.getMedalRanksForIds(playerIds, { partitionByCountry: true }),
      ]);

      return Promise.all(
        players.map(async ({ id }) => {
          const playerData = await ScoreSaberPlayerService.getPlayer(
            id,
            "basic",
            await ScoreSaberPlayerService.getCachedPlayer(id)
          );
          playerData.medalsRank = globalRankMap.get(id) ?? 0;
          playerData.countryMedalsRank = countryRankMap.get(id) ?? 0;
          return playerData;
        })
      );
    });

    return {
      ...pageData,
      countryMetadata: Object.fromEntries(
        countryMetadataRows.filter(r => r.country).map(r => [r.country!, r.count])
      ),
    } as PlayerMedalRankingsResponse;
  }

  /**
   * Gets a player's global medal rank.
   *
   * @param playerId the id of the player
   * @returns the rank, or null if the player has no medals
   */
  public static async getPlayerMedalRank(playerId: string): Promise<number | null> {
    return ScoreSaberAccountsRepository.getPlayerGlobalMedalRank(playerId);
  }

  /**
   * Gets a player's country medal rank.
   *
   * @param playerId the id of the player
   * @returns the rank, or null if the player has no medals
   */
  public static async getPlayerCountryMedalRank(playerId: string): Promise<number | null> {
    return ScoreSaberAccountsRepository.getPlayerCountryMedalRank(playerId);
  }
}
