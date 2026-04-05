import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberMedalsRepository } from "../../repositories/scoresaber-medals.repository";

const RANKED_MEDAL_RECOMPUTE_CONCURRENCY = 8;

export class PlayerMedalsService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Player Medals");

  /**
   * Recomputes score medals for a leaderboard and syncs medal totals for affected players.
   *
   * @param leaderboardId the leaderboard id
   */
  public static async refreshLeaderboardMedals(leaderboardId: number): Promise<void> {
    const before = performance.now();
    const playerIds = await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard(leaderboardId);
    await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds(playerIds);
    PlayerMedalsService.logger.info(
      `Refreshed leaderboard medals for ${leaderboardId} in ${formatDuration(performance.now() - before)}`
    );
  }

  /**
   * Recomputes score medals for every ranked leaderboard, then syncs all account medal totals from scores
   * and refreshes materialized medal rank columns.
   */
  public static async recomputeMedalsFromScoresAndRefreshAccounts(): Promise<void> {
    PlayerMedalsService.logger.info("Recomputing medals from scores and refreshing accounts…");
    const rankedLeaderboardIds = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards();
    const ids = rankedLeaderboardIds.map(l => l.id);
    const total = ids.length;
    const tLoop = performance.now();
    let done = 0;

    for (const batch of chunkArray(ids, RANKED_MEDAL_RECOMPUTE_CONCURRENCY)) {
      await Promise.all(
        batch.map(id => ScoreSaberMedalsRepository.updateMedalsOnRankedLeaderboard(id))
      );
      done += batch.length;
      const logEvery = 200;
      if (done % logEvery === 0 || done === total) {
        PlayerMedalsService.logger.info(
          `Medal recompute progress: ${done}/${total} ranked leaderboards in ${formatDuration(performance.now() - tLoop)}`
        );
      }
    }

    PlayerMedalsService.logger.info(
      `Finished per-leaderboard medal recompute (${total} maps) in ${formatDuration(performance.now() - tLoop)}`
    );

    const tSync = performance.now();
    await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
    PlayerMedalsService.logger.info(
      `Synced global medal totals from scores in ${formatDuration(performance.now() - tSync)}`
    );

    const tRanks = performance.now();
    await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
    PlayerMedalsService.logger.info(
      `Refreshed materialized medal ranks in ${formatDuration(performance.now() - tRanks)}`
    );
  }

  /**
   * Syncs every account medal total from scores and refreshes materialized medal rank columns (does not
   * recompute per-score medals).
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
   * Returns a page of the medal leaderboard.
   *
   * @param page the page number
   * @param country optional country filter
   * @returns players and pagination metadata
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
          playerData.medalsCountryRank = ranks?.medalsCountryRank ?? 0;
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
