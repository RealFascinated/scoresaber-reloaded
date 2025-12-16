import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberLeaderboardStarChangeModel } from "@ssr/common/model/leaderboard/leaderboard-star-change";
import { ScoreSaberPreviousScoreModel } from "@ssr/common/model/score/impl/scoresaber-previous-score";
import { ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import PlaylistService from "../playlist/playlist.service";
import { MedalScoresService } from "../score/medal-scores.service";
import { LeaderboardCoreService } from "./leaderboard-core.service";

export type LeaderboardUpdate = {
  previousLeaderboard?: ScoreSaberLeaderboard;
  newLeaderboard: ScoreSaberLeaderboard;
};

export class LeaderboardRankingService {
  /**
   * Refreshes the ranked leaderboards
   *
   * @returns the leaderboards that had an update (eg: unranked -> ranked)
   */
  public static async refreshRankedLeaderboards(): Promise<LeaderboardUpdate[]> {
    Logger.info(`[RANKED UPDATES] Refreshing ranked leaderboards...`);
    const { leaderboards, leaderboardDifficulties } =
      await LeaderboardCoreService.fetchLeaderboardsFromAPI("ranked", true);
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} ranked leaderboards.`);

    // todo: handle leaderboards that are no longer ranked

    async function reweightHistoryScores(leaderboard: ScoreSaberLeaderboard) {
      Logger.info(
        `[RANKED UPDATES] Reweighting history scores for leaderboard "${leaderboard.id}"...`
      );

      const scores = await ScoreSaberPreviousScoreModel.find({ leaderboardId: leaderboard.id })
        .select({ pp: 1, accuracy: 1 })
        .lean();
      await ScoreSaberPreviousScoreModel.bulkWrite(
        scores.map(score => ({
          updateOne: {
            filter: { _id: score._id },
            update: { $set: { pp: ScoreSaberCurve.getPp(leaderboard.stars, score.accuracy) } },
          },
        }))
      );

      Logger.info(
        `[RANKED UPDATES] Reweighted ${scores.length} history scores for leaderboard "${leaderboard.id}".`
      );
    }

    async function updateLeaderboardScores(leaderboard: ScoreSaberLeaderboard) {
      Logger.info(`[RANKED UPDATES] Updating scores for leaderboard "${leaderboard.id}"...`);
      let hasMorePages = true;
      let page = 1;
      let updatedScoresCount = 0;

      while (hasMorePages) {
        const response = await ApiServiceRegistry.getInstance()
          .getScoreSaberService()
          .lookupLeaderboardScores(leaderboard.id + "", page);
        if (!response) {
          hasMorePages = false;
          continue;
        }

        for (const scoreToken of response.scores) {
          const score = getScoreSaberScoreFromToken(
            scoreToken,
            leaderboard,
            scoreToken.leaderboardPlayerInfo.id
          );
          if (!score) {
            continue;
          }

          // Update or create the score
          await ScoreSaberScoreModel.findOneAndUpdate(
            { scoreId: score.scoreId },
            { $set: { ...score } },
            { upsert: true }
          );
          updatedScoresCount++;
        }

        const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
        if (page % 10 === 0 || page === 1 || page >= totalPages) {
          Logger.info(
            `[RANKED UPDATES] Updated ${updatedScoresCount} scores for leaderboard "${leaderboard.id}" on page ${page}/${totalPages}.`
          );
        }

        page++;
        hasMorePages = page < totalPages;
      }
      Logger.info(
        `[RANKED UPDATES] Updated ${updatedScoresCount} scores for leaderboard "${leaderboard.id}".`
      );
    }

    // Process the leaderboards
    let checked = 0;
    const updatedLeaderboards: LeaderboardUpdate[] = [];
    for (const apiLeaderboard of leaderboards) {
      checked++;
      if (checked % 500 === 0 || checked === 1 || checked === leaderboards.length) {
        Logger.info(`[RANKED UPDATES] Checked ${checked} of ${leaderboards.length} leaderboards.`);
      }

      const dbLeaderboard = await ScoreSaberLeaderboardModel.findOne({ _id: apiLeaderboard.id })
        .select({ stars: 1, ranked: 1, qualified: 1 })
        .lean();
      const leaderboardUpdated =
        dbLeaderboard?.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard?.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard?.stars !== apiLeaderboard.stars;

      // Update or create the leaderboard
      await ScoreSaberLeaderboardModel.findOneAndUpdate(
        { _id: apiLeaderboard.id },
        {
          $set: {
            ...apiLeaderboard,
            difficulties: leaderboardDifficulties.get(apiLeaderboard.songHash) ?? [],
          },
        },
        { upsert: true }
      );

      if (!leaderboardUpdated) {
        continue;
      }

      updatedLeaderboards.push({
        previousLeaderboard: dbLeaderboard ?? undefined,
        newLeaderboard: apiLeaderboard,
      });

      // Reweight the history scores if the stars have changed
      if (dbLeaderboard?.stars !== apiLeaderboard.stars) {
        await reweightHistoryScores(apiLeaderboard);
      }

      // Previously unranked, now ranked
      if (!dbLeaderboard?.ranked && apiLeaderboard.ranked) {
        await MedalScoresService.rescanLeaderboard(apiLeaderboard.id + "", true);
        await updateLeaderboardScores(apiLeaderboard);
        continue;
      }
    }

    const playlistSongs: Map<string, PlaylistSong> = new Map();
    for (const leaderboard of leaderboards) {
      // Ignore unranked leaderboards
      if (!leaderboard.ranked) {
        continue;
      }

      const song = playlistSongs.get(leaderboard.songHash);
      if (!song) {
        playlistSongs.set(leaderboard.songHash, {
          songName: leaderboard.songName,
          songAuthor: leaderboard.songAuthorName,
          songHash: leaderboard.songHash,
          difficulties: [
            {
              difficulty: leaderboard.difficulty.difficulty,
              characteristic: leaderboard.difficulty.characteristic,
            },
          ],
        });
        continue;
      }
      song.difficulties.push({
        difficulty: leaderboard.difficulty.difficulty,
        characteristic: leaderboard.difficulty.characteristic,
      });
    }

    // Update the ranked playlist
    await PlaylistService.updatePlaylist("scoresaber-ranked-maps", {
      title: `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`,
      songs: Array.from(playlistSongs.values()),
    });

    return updatedLeaderboards;
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards() {
    Logger.info(`[RANKED UPDATES] Refreshing qualified leaderboards...`);
    const { leaderboards, leaderboardDifficulties } =
      await LeaderboardCoreService.fetchLeaderboardsFromAPI("qualified", true);
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} qualified leaderboards.`);

    for (const apiLeaderboard of leaderboards) {
      const dbLeaderboard = await ScoreSaberLeaderboardModel.findOne({ _id: apiLeaderboard.id })
        .select({ stars: 1, ranked: 1, qualified: 1 })
        .lean();
      const leaderboardUpdated =
        dbLeaderboard?.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard?.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard?.stars !== apiLeaderboard.stars;

      if (!leaderboardUpdated) {
        continue;
      }

      // Update or create the leaderboard
      await ScoreSaberLeaderboardModel.findOneAndUpdate(
        { _id: apiLeaderboard.id },
        {
          $set: {
            ...apiLeaderboard,
            difficulties: leaderboardDifficulties.get(apiLeaderboard.songHash) ?? [],
          },
        },
        { upsert: true }
      );
    }

    const playlistSongs: Map<string, PlaylistSong> = new Map();
    for (const leaderboard of leaderboards) {
      // Ignore unranked leaderboards
      if (!leaderboard.qualified) {
        continue;
      }

      const song = playlistSongs.get(leaderboard.songHash);
      if (!song) {
        playlistSongs.set(leaderboard.songHash, {
          songName: leaderboard.songName,
          songAuthor: leaderboard.songAuthorName,
          songHash: leaderboard.songHash,
          difficulties: [
            {
              difficulty: leaderboard.difficulty.difficulty,
              characteristic: leaderboard.difficulty.characteristic,
            },
          ],
        });
        continue;
      }
      song.difficulties.push({
        difficulty: leaderboard.difficulty.difficulty,
        characteristic: leaderboard.difficulty.characteristic,
      });
    }

    await PlaylistService.updatePlaylist("scoresaber-ranking-queue-maps", {
      songs: Array.from(playlistSongs.values()),
    });
  }

  /**
   * Fetches the star change history for a given leaderboard
   */
  public static async fetchStarChangeHistory(
    leaderboard: ScoreSaberLeaderboard
  ): Promise<LeaderboardStarChange[]> {
    return (
      await ScoreSaberLeaderboardStarChangeModel.find({
        leaderboardId: leaderboard.id,
      })
        .lean()
        .sort({ timestamp: -1 })
    ).map(starChange => ({
      previousStars: starChange.previousStars,
      newStars: starChange.newStars,
      timestamp: starChange.timestamp,
    }));
  }
}
