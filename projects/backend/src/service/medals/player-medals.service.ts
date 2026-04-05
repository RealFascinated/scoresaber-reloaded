import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberMedalsRepository } from "../../repositories/scoresaber-medals.repository";

export class PlayerMedalsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Medals");

  /**
   * Recomputes `scores.medals` for one leaderboard and refreshes affected accounts' global medal totals.
   */
  public static async refreshLeaderboardMedals(leaderboardId: number): Promise<void> {
    const before = performance.now();
    const playerIds = await ScoreSaberMedalsRepository.recomputeRowMedalsForLeaderboard(leaderboardId);
    await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds(playerIds);
    PlayerMedalsService.logger.info(
      `Refreshed leaderboard medals for ${leaderboardId} in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Recomputes per-score medals from ranked leaderboards, syncs account totals from
   * `SUM(scores.medals)`, and refreshes materialized medal ranks.
   */
  public static async recomputeMedalsFromScoresAndRefreshAccounts(): Promise<void> {
    PlayerMedalsService.logger.info("Recomputing medals from scores and refreshing accounts…");
    const rankedLeaderboardIds = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards();
    for (const leaderboard of rankedLeaderboardIds) {
      const before = performance.now();
      PlayerMedalsService.logger.info(`Recomputing medals for leaderboard ${leaderboard.id}…`);
      await ScoreSaberMedalsRepository.recomputeRowMedalsForLeaderboard(leaderboard.id);
      PlayerMedalsService.logger.info(
        `Refreshed leaderboard medals for ${leaderboard.id} in ${formatDuration(performance.now() - before)}`
      );
    }
    await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
    await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
  }

  /**
   * Re-syncs every account's `medals` from `SUM(scores.medals)` and refreshes materialized ranks (no row recompute).
   */
  public static async resyncAccountMedalTotalsAndRefreshRanks(): Promise<void> {
    PlayerMedalsService.logger.info("Syncing global medal totals from scores…");
    const t0 = performance.now();
    await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
    PlayerMedalsService.logger.info(
      `Synced global medal totals in ${formatDuration(performance.now() - t0)}`
    );
    await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
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
    const { default: ScoreSaberPlayerService } = await import("../player/scoresaber-player.service");

    const itemsPerPage = 50;

    const [totalPlayers, countryMetadataRows] = await Promise.all([
      ScoreSaberMedalsRepository.countMedalRankingEligible(country),
      ScoreSaberMedalsRepository.selectMedalRankingCountryMetadata(country),
    ]);

    if (totalPlayers === 0) {
      return { ...Pagination.empty<ScoreSaberPlayer>(), countryMetadata: {} } as PlayerMedalRankingsResponse;
    }

    const pagination = new Pagination<ScoreSaberPlayer>()
      .setItemsPerPage(itemsPerPage)
      .setTotalItems(totalPlayers);

    const pageData = await pagination.getPage(page, async fetchRange => {
      const players = await ScoreSaberMedalsRepository.selectMedalRankingPage(
        country,
        fetchRange.start,
        fetchRange.end - fetchRange.start
      );

      if (!players.length) return [];

      const playerIds = players.map(p => p.id);
      const rankRows = await ScoreSaberMedalsRepository.selectMedalRanksByIds(playerIds);
      const rankById = new Map(rankRows.map(r => [r.id, r]));

      return Promise.all(
        players.map(async ({ id }) => {
          const playerData = await ScoreSaberPlayerService.getPlayer(
            id,
            "basic",
            await ScoreSaberPlayerService.getCachedPlayer(id)
          );
          const ranks = rankById.get(id);
          playerData.medalsRank = country ? (ranks?.medalsCountryRank ?? 0) : (ranks?.medalsRank ?? 0);
          playerData.countryMedalsRank = ranks?.medalsCountryRank ?? 0;
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
}
