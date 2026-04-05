import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ScoreSaberAccountsRepository } from "../../repositories/scoresaber-accounts.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import ScoreSaberPlayerService from "../player/scoresaber-player.service";

export class PlayerMedalsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Medals");

  /**
   * Recomputes per-score medals from ranked leaderboards, syncs account totals from
   * `SUM(scores.medals)`, and refreshes materialized medal ranks.
   */
  public static async recomputeMedalsFromScoresAndRefreshAccounts(): Promise<void> {
    const t0 = performance.now();
    await ScoreSaberScoresRepository.recomputeRowMedalsForRankedLeaderboards();
    const recomputeMs = performance.now() - t0;

    const t1 = performance.now();
    await ScoreSaberAccountsRepository.syncGlobalMedalTotalsFromScoresTable();
    await ScoreSaberAccountsRepository.refreshMaterializedMedalRanks();
    const accountsMs = performance.now() - t1;

    PlayerMedalsService.logger.info(
      `Medal job: recompute scores.medals in ${formatDuration(recomputeMs)}; accounts + ranks in ${formatDuration(accountsMs)} (total ${formatDuration(performance.now() - t0)})`
    );
  }

  /**
   * Updates the global medal count for all players (scheduled job entry point).
   */
  public static async updatePlayerGlobalMedalCounts(): Promise<void> {
    await PlayerMedalsService.recomputeMedalsFromScoresAndRefreshAccounts();
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
      const rankRows = await ScoreSaberAccountsRepository.selectMedalRanksByIds(playerIds);
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
