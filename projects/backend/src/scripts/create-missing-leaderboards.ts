import Logger from "@ssr/common/logger";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { db } from "../db";
import { scoreSaberLeaderboardsTable } from "../db/schema";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { ScoreSaberApiService } from "../service/scoresaber-api.service";
import StorageService from "../service/storage.service";

async function createMissingLeaderboards() {
  const existingLeaderboards = await db
    .select({ id: scoreSaberLeaderboardsTable.id })
    .from(scoreSaberLeaderboardsTable);

  let hasMorePages = true;
  let page = 17100;
  while (hasMorePages) {
    const response = await ScoreSaberApiService.lookupLeaderboards(page);
    if (!response) {
      hasMorePages = false;
      continue;
    }

    let createdLeaderboards = 0;
    for (const token of response.leaderboards) {
      const existingLeaderboard = existingLeaderboards.find(l => l.id === token.id);
      if (existingLeaderboard) {
        continue;
      }

      try {
        const leaderboard = getScoreSaberLeaderboardFromToken(token);
        await LeaderboardCoreService.saveLeaderboard(leaderboard.id, leaderboard);
        createdLeaderboards++;
      } catch (error) {
        Logger.error(`Error creating leaderboard "${token.id}": ${error}`);
      }
    }

    Logger.info(`Created ${createdLeaderboards} leaderboards on page ${page}`);

    hasMorePages = page < Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
    page++;
  }
}

await new StorageService().initBuckets();
createMissingLeaderboards().catch(console.error);
