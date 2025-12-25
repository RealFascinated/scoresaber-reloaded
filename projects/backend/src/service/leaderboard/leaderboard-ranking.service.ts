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
import { formatDate, formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { AnyBulkWriteOperation } from "mongoose";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import PlaylistService, { PLAYLIST_NAMES } from "../playlist/playlist.service";
import { MedalScoresService } from "../score/medal-scores.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
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
    const before = performance.now();

    Logger.info(`[RANKED UPDATES] Refreshing ranked leaderboards...`);
    const { leaderboards, leaderboardDifficulties } = await LeaderboardCoreService.fetchLeaderboardsFromAPI(
      "ranked",
      true
    );
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} ranked leaderboards.`);

    // todo: handle leaderboards that are no longer ranked

    async function reweightHistoryScores(leaderboard: ScoreSaberLeaderboard) {
      Logger.info(`[RANKED UPDATES] Reweighting history scores for leaderboard "${leaderboard.id}"...`);

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
        const response = await ScoreSaberApiService.lookupLeaderboardScores(leaderboard.id, page);
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

    const rankedLeaderboards: Map<number, ScoreSaberLeaderboard> = (await ScoreSaberLeaderboardModel.find({
      ranked: true,
    })
      .select({ _id: 1, stars: 1, ranked: 1, qualified: 1 })
      .lean()
      .then(leaderboards => new Map(leaderboards.map(leaderboard => [leaderboard._id, leaderboard])))) as Map<
      number,
      ScoreSaberLeaderboard
    >;

    const leaderboardBulkWrite: AnyBulkWriteOperation<ScoreSaberLeaderboard>[] = [];
    const updatedLeaderboards: LeaderboardUpdate[] = [];

    // Process the leaderboards
    let checked = 0;
    for (const apiLeaderboard of leaderboards) {
      checked++;
      if (checked % 500 === 0 || checked === 1 || checked === leaderboards.length) {
        Logger.info(`[RANKED UPDATES] Checked ${checked} of ${leaderboards.length} leaderboards.`);
      }

      const dbLeaderboard = rankedLeaderboards.get(apiLeaderboard.id);
      const leaderboardUpdated =
        dbLeaderboard?.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard?.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard?.stars !== apiLeaderboard.stars;

      // Update or create the leaderboard if the leaderboard has been updated or the daily/plays have changed
      if (
        !dbLeaderboard ||
        leaderboardUpdated ||
        dbLeaderboard.dailyPlays !== apiLeaderboard.dailyPlays ||
        dbLeaderboard.plays !== apiLeaderboard.plays
      ) {
        leaderboardBulkWrite.push({
          updateOne: {
            filter: { _id: apiLeaderboard.id },
            update: {
              $set: {
                ...apiLeaderboard,
                difficulties: leaderboardDifficulties.get(apiLeaderboard.songHash) ?? [],
              },
            },
            upsert: true,
          },
        });
      }

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
        await MedalScoresService.rescanLeaderboard(apiLeaderboard.id, true);
        await updateLeaderboardScores(apiLeaderboard);
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

    if (leaderboardBulkWrite.length > 0) {
      Logger.info(`[RANKED UPDATES] Updating ${leaderboardBulkWrite.length} leaderboards...`);

      for (const batch of chunkArray(leaderboardBulkWrite, 250)) {
        await ScoreSaberLeaderboardModel.bulkWrite(batch);
        Logger.info(`[RANKED UPDATES] Updated batch of ${batch.length} leaderboards!`);
      }

      Logger.info(
        `[RANKED UPDATES] Updated ${leaderboardBulkWrite.length} leaderboards in ${formatDuration(performance.now() - before)}`
      );

      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Ranked Leaderboards Updated")
          .setDescription(
            `Updated ${leaderboardBulkWrite.length} leaderboards in ${formatDuration(performance.now() - before)}`
          )
          .setColor("#00ff00")
      );
    }

    // Update the ranked playlist
    await PlaylistService.updatePlaylist("scoresaber-ranked-maps", {
      title: `${PLAYLIST_NAMES["scoresaber-ranked-maps"]} (${formatDate(new Date(), "Do MMMM, YYYY")})`,
      songs: Array.from(playlistSongs.values()),
    });
    Logger.info(`[RANKED UPDATES] Updated ranked playlist!`);
    return updatedLeaderboards;
  }

  /**
   * Refreshes the qualified leaderboards
   */
  public static async refreshQualifiedLeaderboards() {
    const before = performance.now();

    Logger.info(`[RANKED UPDATES] Refreshing qualified leaderboards...`);
    const { leaderboards, leaderboardDifficulties } = await LeaderboardCoreService.fetchLeaderboardsFromAPI(
      "qualified",
      true
    );
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} qualified leaderboards.`);

    const leaderboardBulkWrite: AnyBulkWriteOperation<ScoreSaberLeaderboard>[] = [];

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
      leaderboardBulkWrite.push({
        updateOne: {
          filter: { _id: apiLeaderboard.id },
          update: {
            $set: {
              ...apiLeaderboard,
              difficulties: leaderboardDifficulties.get(apiLeaderboard.songHash) ?? [],
            },
          },
          upsert: true,
        },
      });
    }

    if (leaderboardBulkWrite.length > 0) {
      Logger.info(`[RANKED UPDATES] Updating ${leaderboardBulkWrite.length} leaderboards...`);
      await ScoreSaberLeaderboardModel.bulkWrite(leaderboardBulkWrite);
      Logger.info(
        `[RANKED UPDATES] Updated ${leaderboardBulkWrite.length} leaderboards in ${formatDuration(performance.now() - before)}`
      );

      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Qualified Leaderboards Updated")
          .setDescription(
            `Updated ${leaderboardBulkWrite.length} leaderboards in ${formatDuration(performance.now() - before)}`
          )
          .setColor("#00ff00")
      );
    }

    await PlaylistService.updatePlaylist("scoresaber-qualified-maps", {
      title: `${PLAYLIST_NAMES["scoresaber-qualified-maps"]} (${formatDate(new Date(), "Do MMMM, YYYY")})`,
      songs: leaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        songAuthor: leaderboard.songAuthorName,
        songHash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    });
    Logger.info(`[RANKED UPDATES] Updated qualified playlist!`);
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
