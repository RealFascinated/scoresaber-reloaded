import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import Logger from "@ssr/common/logger";
import { Player, PlayerModel } from "@ssr/common/model/player/player";
import { BeatLeaderScoreToken } from "@ssr/common/schemas/beatleader/tokens/score/score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import BeatLeaderService from "../beatleader.service";

type SeedMode = "backfill" | "requested";

export class PlayerBeatLeaderScoresService {
  public static async fetchMissingBeatLeaderScores(
    player: Player,
    options: { mode: SeedMode }
  ): Promise<{
    totalPagesFetched: number;
    newScoresTracked: number;
    stoppedBecauseAllTrackedPage: boolean;
  }> {
    const playerId = player._id;
    if (!playerId) {
      return { totalPagesFetched: 0, newScoresTracked: 0, stoppedBecauseAllTrackedPage: false };
    }

    const beatLeaderApi = ApiServiceRegistry.getInstance().getBeatLeaderService();

    const result = {
      totalPagesFetched: 0,
      newScoresTracked: 0,
      stoppedBecauseAllTrackedPage: false,
    };

    const maxNoNewPages = 2;
    let consecutiveNoNewPages = 0;

    let page = 1;
    while (true) {
      const pageToken = await beatLeaderApi.lookupPlayerScores(playerId, page, {
        count: 100,
        sortBy: "date",
        order: "desc",
        leaderboardContext: "general",
        includeIO: true,
      });

      if (!pageToken) {
        break;
      }

      // Avoid wasting requests on empty pages.
      const scores = pageToken.data ?? [];
      if (scores.length === 0) {
        break;
      }

      // Prefetch what already exists for this page.
      const scoreIds = scores.map(score => score.id);
      const existing = await BeatLeaderService.scoresExist(scoreIds);
      const uniqueIdsCount = new Set(scoreIds).size;
      const allTrackedOnPage = existing.size >= uniqueIdsCount;

      if (allTrackedOnPage) {
        result.stoppedBecauseAllTrackedPage = true;
        break;
      }

      let newTrackedThisPage = 0;
      for (const scoreToken of scores) {
        if (existing.has(scoreToken.id)) {
          continue;
        }
        const tracked = await BeatLeaderService.trackBeatLeaderScore(
          scoreToken as BeatLeaderScoreToken,
          false
        );
        if (tracked) {
          newTrackedThisPage++;
        }
      }

      result.totalPagesFetched++;
      result.newScoresTracked += newTrackedThisPage;

      if (newTrackedThisPage === 0) {
        consecutiveNoNewPages++;
        if (consecutiveNoNewPages >= maxNoNewPages) {
          break;
        }
      } else {
        consecutiveNoNewPages = 0;
      }

      page++;
    }

    // Mark seeded following plan semantics.
    if (options.mode === "backfill") {
      if (result.stoppedBecauseAllTrackedPage) {
        if (!player.seededBeatLeaderScores) {
          await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
        }
      } else if (result.totalPagesFetched > 0) {
        // Backfill mode: consider a clean run that fetched pages as "seeded enough" to avoid re-running forever.
        if (!player.seededBeatLeaderScores) {
          await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
        }
      }
    } else {
      if (result.stoppedBecauseAllTrackedPage && !player.seededBeatLeaderScores) {
        await PlayerModel.updateOne({ _id: playerId }, { $set: { seededBeatLeaderScores: true } });
      }
    }

    if (result.totalPagesFetched > 0 || result.newScoresTracked > 0) {
      Logger.info(
        `[BeatLeader Seed] Player %s fetched %s page(s), tracked %s new score(s)`,
        playerId,
        formatNumberWithCommas(result.totalPagesFetched),
        formatNumberWithCommas(result.newScoresTracked)
      );
    }

    return result;
  }
}
