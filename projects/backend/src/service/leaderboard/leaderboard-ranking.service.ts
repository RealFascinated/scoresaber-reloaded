import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger from "@ssr/common/logger";
import { PlaylistSong } from "@ssr/common/playlist/playlist-song";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getScoreSaberScoreFromToken } from "@ssr/common/token-creators";
import { formatDate, formatDuration } from "@ssr/common/utils/time-utils";
import { chunkArray } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { db } from "../../db";
import {
  scoreSaberLeaderboardsTable,
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberScoreHistoryTable,
  scoreSaberScoresTable,
} from "../../db/schema";
import CacheService from "../cache.service";
import PlaylistService, { PLAYLIST_NAMES } from "../playlist/playlist.service";
import { MedalScoresService } from "../score/medal-scores.service";
import { ScoreSaberApiService } from "../scoresaber-api.service";
import { LeaderboardCoreService } from "./leaderboard-core.service";

/** Row shape from Postgres for ranked maps we compare during sync. */
export type RankedLeaderboardSnapshot = {
  id: number;
  ranked: boolean;
  qualified: boolean;
  stars: number | null;
  plays: number;
  dailyPlays: number;
};

export type LeaderboardUpdate = {
  previousLeaderboard?: Pick<RankedLeaderboardSnapshot, "ranked" | "qualified" | "stars">;
  newLeaderboard: ScoreSaberLeaderboard;
};

const scoreUpsertSet = {
  playerId: sql`excluded."playerId"`,
  leaderboardId: sql`excluded."leaderboardId"`,
  difficulty: sql`excluded."difficulty"`,
  characteristic: sql`excluded."characteristic"`,
  score: sql`excluded."score"`,
  accuracy: sql`excluded."accuracy"`,
  pp: sql`excluded."pp"`,
  missedNotes: sql`excluded."missedNotes"`,
  badCuts: sql`excluded."badCuts"`,
  maxCombo: sql`excluded."maxCombo"`,
  fullCombo: sql`excluded."fullCombo"`,
  modifiers: sql`excluded."modifiers"`,
  hmd: sql`excluded."hmd"`,
  rightController: sql`excluded."rightController"`,
  leftController: sql`excluded."leftController"`,
  timestamp: sql`excluded."timestamp"`,
} as const;

export class LeaderboardRankingService {
  /**
   * Refreshes the ranked leaderboards
   *
   * @returns the leaderboards that had an update (eg: unranked -> ranked)
   */
  public static async refreshRankedLeaderboards(): Promise<LeaderboardUpdate[]> {
    const before = performance.now();

    Logger.info(`[RANKED UPDATES] Refreshing ranked leaderboards...`);
    const { leaderboards } = await LeaderboardCoreService.fetchLeaderboardsFromAPI("ranked", true);
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} ranked leaderboards.`);

    async function reweightHistoryScores(leaderboard: ScoreSaberLeaderboard) {
      Logger.info(`[RANKED UPDATES] Reweighting history scores for leaderboard "${leaderboard.id}"...`);

      const rows = await db
        .select({
          id: scoreSaberScoreHistoryTable.id,
          pp: scoreSaberScoreHistoryTable.pp,
          accuracy: scoreSaberScoreHistoryTable.accuracy,
        })
        .from(scoreSaberScoreHistoryTable)
        .where(eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboard.id));

      const updates = rows
        .map(row => {
          const newPp = ScoreSaberCurve.getPp(leaderboard.stars, row.accuracy);
          return row.pp !== newPp ? { id: row.id, newPp } : null;
        })
        .filter((u): u is { id: number; newPp: number } => u !== null);

      if (updates.length > 0) {
        await Promise.all(
          updates.map(u =>
            db
              .update(scoreSaberScoreHistoryTable)
              .set({ pp: u.newPp })
              .where(eq(scoreSaberScoreHistoryTable.id, u.id))
          )
        );
        Logger.info(
          `[RANKED UPDATES] Reweighted ${updates.length} of ${rows.length} history scores for leaderboard "${leaderboard.id}".`
        );
      } else {
        Logger.info(
          `[RANKED UPDATES] No PP changes needed for ${rows.length} history scores for leaderboard "${leaderboard.id}".`
        );
      }
    }

    async function updateLeaderboardScores(leaderboard: ScoreSaberLeaderboard) {
      Logger.info(`[RANKED UPDATES] Updating scores for leaderboard "${leaderboard.id}"...`);
      let hasMorePages = true;
      let page = 1;
      const scoreOps: ScoreSaberScore[] = [];

      while (hasMorePages) {
        const response = await ScoreSaberApiService.lookupLeaderboardScores(leaderboard.id, page);
        if (!response) {
          hasMorePages = false;
          continue;
        }

        for (const scoreToken of response.scores) {
          scoreOps.push(
            getScoreSaberScoreFromToken(scoreToken, leaderboard, scoreToken.leaderboardPlayerInfo.id)
          );
        }

        const totalPages = Math.ceil(response.metadata.total / response.metadata.itemsPerPage);
        if (page % 10 === 0 || page === 1 || page >= totalPages) {
          Logger.info(
            `[RANKED UPDATES] Queued scores for leaderboard "${leaderboard.id}" on page ${page}/${totalPages}.`
          );
        }

        page++;
        hasMorePages = page < totalPages;
      }

      if (scoreOps.length === 0) {
        return;
      }

      const scoreIds = scoreOps.map(s => s.scoreId);
      const existingRows = await db
        .select({
          scoreId: scoreSaberScoresTable.scoreId,
          score: scoreSaberScoresTable.score,
          pp: scoreSaberScoresTable.pp,
        })
        .from(scoreSaberScoresTable)
        .where(
          and(
            inArray(scoreSaberScoresTable.scoreId, scoreIds),
            eq(scoreSaberScoresTable.leaderboardId, leaderboard.id)
          )
        );

      const existingMap = new Map(existingRows.map(r => [r.scoreId, { score: r.score, pp: r.pp }]));

      const toWrite = scoreOps.filter(s => {
        const ex = existingMap.get(s.scoreId);
        return !ex || ex.score !== s.score || ex.pp !== s.pp;
      });

      if (toWrite.length === 0) {
        Logger.info(
          `[RANKED UPDATES] No score changes needed for leaderboard "${leaderboard.id}" (${scoreOps.length} scores checked).`
        );
        return;
      }

      let upserted = 0;
      for (const batch of chunkArray(toWrite, 100)) {
        const rows = batch.map(score => {
          const modifiers = score.modifiers.map(m => m.toString());
          return {
            scoreId: score.scoreId,
            playerId: score.playerId,
            leaderboardId: score.leaderboardId,
            difficulty: score.difficulty,
            characteristic: score.characteristic,
            score: score.score,
            accuracy: score.accuracy,
            pp: score.pp,
            missedNotes: score.missedNotes,
            badCuts: score.badCuts,
            maxCombo: score.maxCombo,
            fullCombo: score.fullCombo,
            modifiers: modifiers.length > 0 ? modifiers : null,
            hmd: score.hmd,
            rightController: score.rightController,
            leftController: score.leftController,
            timestamp: score.timestamp,
          };
        });
        await db.insert(scoreSaberScoresTable).values(rows).onConflictDoUpdate({
          target: scoreSaberScoresTable.scoreId,
          set: scoreUpsertSet,
        });
        upserted += batch.length;
      }

      Logger.info(
        `[RANKED UPDATES] Upserted ${upserted} of ${scoreOps.length} scores for leaderboard "${leaderboard.id}" (${scoreOps.length - toWrite.length} skipped).`
      );
    }

    const dbRankedRows = await db
      .select({
        id: scoreSaberLeaderboardsTable.id,
        stars: scoreSaberLeaderboardsTable.stars,
        ranked: scoreSaberLeaderboardsTable.ranked,
        qualified: scoreSaberLeaderboardsTable.qualified,
        plays: scoreSaberLeaderboardsTable.plays,
        dailyPlays: scoreSaberLeaderboardsTable.dailyPlays,
      })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.ranked, true));

    const rankedLeaderboards = new Map<number, RankedLeaderboardSnapshot>(dbRankedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert: ScoreSaberLeaderboard[] = [];
    const updatedLeaderboards: LeaderboardUpdate[] = [];

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

      if (
        !dbLeaderboard ||
        leaderboardUpdated ||
        dbLeaderboard.dailyPlays !== apiLeaderboard.dailyPlays ||
        dbLeaderboard.plays !== apiLeaderboard.plays
      ) {
        leaderboardsToUpsert.push(apiLeaderboard);
      }

      if (!leaderboardUpdated) {
        continue;
      }

      updatedLeaderboards.push({
        previousLeaderboard: dbLeaderboard
          ? { ranked: dbLeaderboard.ranked, qualified: dbLeaderboard.qualified, stars: dbLeaderboard.stars }
          : undefined,
        newLeaderboard: apiLeaderboard,
      });

      if (dbLeaderboard && dbLeaderboard.stars !== apiLeaderboard.stars) {
        await reweightHistoryScores(apiLeaderboard);
        await db.insert(scoreSaberLeaderboardStarChangeTable).values({
          leaderboardId: apiLeaderboard.id,
          previousStars: dbLeaderboard.stars ?? 0,
          newStars: apiLeaderboard.stars,
          timestamp: new Date(),
        });
      }

      if (!dbLeaderboard?.ranked && apiLeaderboard.ranked) {
        await MedalScoresService.rescanLeaderboard(apiLeaderboard.id, true);
        await updateLeaderboardScores(apiLeaderboard);
      }
    }

    const playlistSongs: Map<string, PlaylistSong> = new Map();
    for (const leaderboard of leaderboards) {
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

    if (leaderboardsToUpsert.length > 0) {
      Logger.info(`[RANKED UPDATES] Updating ${leaderboardsToUpsert.length} leaderboards...`);

      for (const batch of chunkArray(leaderboardsToUpsert, 250)) {
        await LeaderboardCoreService.upsertLeaderboardsFromRankingApi(batch);
        Logger.info(`[RANKED UPDATES] Updated batch of ${batch.length} leaderboards!`);
      }

      await CacheService.invalidate("leaderboard:ranked-leaderboards");

      Logger.info(
        `[RANKED UPDATES] Updated ${leaderboardsToUpsert.length} leaderboards in ${formatDuration(performance.now() - before)}`
      );

      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Ranked Leaderboards Updated")
          .setDescription(
            `Updated ${leaderboardsToUpsert.length} leaderboards in ${formatDuration(performance.now() - before)}`
          )
          .setColor("#00ff00")
      );
    }

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
    const { leaderboards } = await LeaderboardCoreService.fetchLeaderboardsFromAPI("qualified", true);
    Logger.info(`[RANKED UPDATES] Found ${leaderboards.length} qualified leaderboards.`);

    const dbQualifiedRows = await db
      .select({
        id: scoreSaberLeaderboardsTable.id,
        stars: scoreSaberLeaderboardsTable.stars,
        ranked: scoreSaberLeaderboardsTable.ranked,
        qualified: scoreSaberLeaderboardsTable.qualified,
      })
      .from(scoreSaberLeaderboardsTable)
      .where(eq(scoreSaberLeaderboardsTable.qualified, true));

    const dbById = new Map(dbQualifiedRows.map(r => [r.id, r]));

    const leaderboardsToUpsert: ScoreSaberLeaderboard[] = [];

    for (const apiLeaderboard of leaderboards) {
      const dbLeaderboard = dbById.get(apiLeaderboard.id);
      const leaderboardUpdated =
        !dbLeaderboard ||
        dbLeaderboard.ranked !== apiLeaderboard.ranked ||
        dbLeaderboard.qualified !== apiLeaderboard.qualified ||
        dbLeaderboard.stars !== apiLeaderboard.stars;

      if (!leaderboardUpdated) {
        continue;
      }

      leaderboardsToUpsert.push(apiLeaderboard);
    }

    if (leaderboardsToUpsert.length > 0) {
      Logger.info(`[RANKED UPDATES] Updating ${leaderboardsToUpsert.length} leaderboards...`);
      await LeaderboardCoreService.upsertLeaderboardsFromRankingApi(leaderboardsToUpsert);
      await CacheService.invalidate("leaderboard:qualified-leaderboards");
      Logger.info(
        `[RANKED UPDATES] Updated ${leaderboardsToUpsert.length} leaderboards in ${formatDuration(performance.now() - before)}`
      );

      sendEmbedToChannel(
        DiscordChannels.BACKEND_LOGS,
        new EmbedBuilder()
          .setTitle("Qualified Leaderboards Updated")
          .setDescription(
            `Updated ${leaderboardsToUpsert.length} leaderboards in ${formatDuration(performance.now() - before)}`
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
    const rows = await db
      .select()
      .from(scoreSaberLeaderboardStarChangeTable)
      .where(eq(scoreSaberLeaderboardStarChangeTable.leaderboardId, leaderboard.id))
      .orderBy(desc(scoreSaberLeaderboardStarChangeTable.timestamp));

    return rows.map(starChange => ({
      previousStars: starChange.previousStars,
      newStars: starChange.newStars,
      timestamp: starChange.timestamp,
    }));
  }
}
