import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { MedalChange } from "@ssr/common/schemas/medals/medal-changes";
import { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { chunkArray } from "@ssr/common/utils/utils";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberMedalsRepository } from "../../repositories/scoresaber-medals.repository";
import ScoreSaberPlayerService from "../player/scoresaber-player.service";

const RANKED_MEDAL_RECOMPUTE_CONCURRENCY = 8;

export class PlayerMedalsService {
  /**
   * Recomputes score medals for a leaderboard and syncs medal totals for affected players.
   * No-ops when the leaderboard is not ranked.
   *
   * @param leaderboard the leaderboard (must be ranked for any work to run)
   * @returns map of account medal total changes (before/after) for players whose global medals changed
   */
  public static async refreshLeaderboardMedals(
    leaderboard: ScoreSaberLeaderboard
  ): Promise<Map<string, MedalChange>> {
    if (!leaderboard.ranked) {
      return new Map();
    }

    const affectedIds = await ScoreSaberMedalsRepository.selectPlayerIdsAffectedByMedalUpdate(leaderboard);
    if (affectedIds.length === 0) {
      const updatedPlayerIds = await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard(leaderboard);
      await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds(updatedPlayerIds);
      return new Map();
    }

    const beforeRows = await ScoreSaberMedalsRepository.selectIdAndMedalsByIds(affectedIds);
    const updatedPlayerIds = await ScoreSaberMedalsRepository.updateMedalsOnLeaderboard(leaderboard);

    await ScoreSaberMedalsRepository.syncMedalTotalsForPlayerIds(updatedPlayerIds);
    const afterRows = await ScoreSaberMedalsRepository.selectIdAndMedalsByIds(affectedIds);

    const beforeById = new Map(beforeRows.map(r => [r.id, r.medals ?? 0]));
    const afterById = new Map(afterRows.map(r => [r.id, r.medals ?? 0]));

    const changes = new Map<string, MedalChange>();
    for (const id of affectedIds) {
      const before = beforeById.get(id) ?? 0;
      const after = afterById.get(id) ?? 0;
      if (before !== after) {
        changes.set(id, { before, after });
      }
    }
    return changes;
  }

  /**
   * Recomputes score medals for every ranked leaderboard, then syncs all account medal totals from scores
   * and refreshes materialized medal rank columns.
   */
  public static async recomputeMedalsFromScoresAndRefreshAccounts(): Promise<void> {
    const rankedLeaderboards = await ScoreSaberLeaderboardsRepository.getRankedLeaderboards();

    for (const batch of chunkArray(rankedLeaderboards, RANKED_MEDAL_RECOMPUTE_CONCURRENCY)) {
      await Promise.all(batch.map(lb => ScoreSaberMedalsRepository.updateMedalsOnRankedLeaderboard(lb)));
    }

    await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
    await ScoreSaberMedalsRepository.refreshMaterializedMedalRanks();
  }

  /**
   * Syncs every account medal total from scores and refreshes materialized medal rank columns (does not
   * recompute per-score medals).
   */
  public static async resyncAccountMedalTotalsAndRefreshRanks(): Promise<void> {
    await ScoreSaberMedalsRepository.syncGlobalMedalTotalsFromScoresTable();
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
    const itemsPerPage = 50;

    const [totalPlayers, countryMetadataRows] = await Promise.all([
      ScoreSaberMedalsRepository.countMedalRankingPlayers(country),
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

      return Promise.all(
        players.map(async ({ id }) => {
          const playerData = await ScoreSaberPlayerService.getPlayer(
            id,
            "basic",
            await ScoreSaberPlayerService.getCachedPlayer(id)
          );
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
