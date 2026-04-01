import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import type { SelfPlaylistSettings } from "@ssr/common/playlist/self/self-playlist-settings-schema";
import { parseSelfPlaylistSettings } from "@ssr/common/playlist/self/self-playlist-utils";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import type { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { eq, gt, gte, isNotNull, lte } from "drizzle-orm";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "../../db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberLeaderboardsService } from "../leaderboard/scoresaber-leaderboards.service";
import { PlayerCoreService } from "../player/player-core.service";

export type SnipeType = "top" | "recent";
export type PlaylistId =
  | "scoresaber-ranked-maps"
  | "scoresaber-qualified-maps"
  | "scoresaber-ranking-queue-maps"
  | "scoresaber-custom-ranked-maps";

export const PLAYLIST_NAMES: Record<PlaylistId, string> = {
  "scoresaber-ranked-maps": "Ranked Maps",
  "scoresaber-qualified-maps": "Qualified Maps",
  "scoresaber-ranking-queue-maps": "Ranking Queue Maps",
  "scoresaber-custom-ranked-maps": "", // unused
};

export default class PlaylistService {
  public static async getRankedMapsPlaylist(): Promise<Playlist> {
    const leaderboards = await ScoreSaberLeaderboardsService.getRankedLeaderboards();

    return {
      playlistTitle: "Ranked Maps",
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/ranked-maps`,
      },
      songs: leaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  public static async getQualifiedMapsPlaylist(): Promise<Playlist> {
    const leaderboards = await ScoreSaberLeaderboardsService.getQualifiedLeaderboards();

    return {
      playlistTitle: "Qualified Maps",
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/qualified-maps`,
      },
      songs: leaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  public static async getRankingQueueMapsPlaylist(): Promise<Playlist> {
    const leaderboards = await ScoreSaberLeaderboardsService.getRankingQueueLeaderboards();

    return {
      playlistTitle: "Ranking Queue Maps",
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/ranking-queue-maps`,
      },
      songs: leaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  /**
   * Creates a playlist for custom ranked maps
   *
   * @param config the configuration for the custom ranked playlist
   * @returns the created custom ranked playlist
   */
  public static async createCustomRankedPlaylist(settingsBase64?: string): Promise<Playlist> {
    const parsedConfig = parseCustomRankedPlaylistSettings(settingsBase64);
    const rankedLeaderboards = await ScoreSaberLeaderboardsRepository.selectRankedByStarsBetween(
      parsedConfig.stars.min,
      parsedConfig.stars.max
    );

    const title = `Custom Ranked Maps (${formatDateMinimal(new Date())})`;

    return {
      playlistTitle: title,
      playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
      customData: {
        syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/custom-ranked-maps?settings=${settingsBase64}`,
      },
      songs: rankedLeaderboards.map(leaderboard => ({
        songName: leaderboard.songName,
        levelAuthorName: leaderboard.songAuthorName,
        hash: leaderboard.songHash,
        difficulties: leaderboard.difficulties.map(difficulty => ({
          difficulty: difficulty.difficulty,
          characteristic: difficulty.characteristic,
        })),
      })),
    };
  }

  /**
   * Creates a self playlist for a user
   *
   * @param user the user to create the playlist for
   * @param settingsBase64 optional base64 encoded settings
   * @returns the created self playlist
   */
  public static async getSelfPlaylist(user: string, settingsBase64?: string): Promise<Playlist> {
    const settings = parseSelfPlaylistSettings(settingsBase64);

    try {
      if (!(await PlayerCoreService.playerExists(user))) {
        throw new NotFoundError(`Unable to create a self playlist as the user isn't tracked.`);
      }

      const scoredLeaderboards = await PlaylistService.fetchPlayerScoreSaberScoresWithLeaderboards(
        user,
        settings.rankedStatus,
        settings.starRange
      );

      if (scoredLeaderboards.length === 0) {
        throw new NotFoundError(`Unable to create a self playlist as the user has no scores.`);
      }

      const filtered = scoredLeaderboards.filter(({ score }) => {
        if (!settings.accuracyRange) {
          return true;
        }
        return score.accuracy >= settings.accuracyRange.min && score.accuracy <= settings.accuracyRange.max;
      });

      if (filtered.length === 0) {
        throw new NotFoundError(`Unable to create a self playlist as no scores match the filters.`);
      }

      PlaylistService.sortPlaylistScoreRows(filtered, settings.sort, settings.sortDirection);

      return {
        playlistTitle: `Self Playlist / ${capitalizeFirstLetter(settings.sort || "pp")} / ${settings.starRange?.min} - ${settings.starRange?.max} stars / ${settings.accuracyRange?.min} - ${settings.accuracyRange?.max}%`,
        playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
        customData: {
          syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/self?user=${user}&settings=${settingsBase64}`,
        },
        songs: filtered.map(({ leaderboard }) => ({
          songName: leaderboard.songName,
          levelAuthorName: leaderboard.songAuthorName,
          hash: leaderboard.songHash,
          difficulties: leaderboard.difficulties.map(difficulty => ({
            difficulty: difficulty.difficulty,
            characteristic: difficulty.characteristic,
          })),
        })),
      };
    } catch (error) {
      Logger.error("Error creating self playlist", error);
      throw new InternalServerError((error as Error).message);
    }
  }

  /**
   * Creates a snipe playlist for a user
   *
   * @param user the user who is sniping
   * @param toSnipe the user being sniped
   * @param type the type of snipe (top or recent)
   * @param settingsBase64 optional base64 encoded settings
   * @returns the created snipe playlist
   */
  public static async getSnipePlaylist(
    user: string,
    toSnipe: string,
    settingsBase64?: string
  ): Promise<Playlist> {
    const settings = parseSnipePlaylistSettings(settingsBase64);

    if (user === toSnipe) {
      throw new BadRequestError("You cannot snipe yourself");
    }

    try {
      // Validate users exist
      if (!(await PlayerCoreService.playerExists(user)) || !(await PlayerCoreService.playerExists(toSnipe))) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`
        );
      }

      async function getScores(playerId: string) {
        const results = await PlaylistService.fetchPlayerScoreSaberScoresWithLeaderboards(
          playerId,
          settings.rankedStatus,
          settings.starRange
        );

        if (results.length === 0) {
          throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
        }

        return results;
      }

      const [userScores, toSnipeScores] = await Promise.all([getScores(user), getScores(toSnipe)]);

      if (userScores.length === 0 || toSnipeScores.length === 0) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as one of the users has no scores.`
        );
      }

      // Build a map of user scores by leaderboard ID for quick lookup
      const userScoreMap = new Map<number, { score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }>();
      for (const userScore of userScores) {
        const leaderboardId = userScore.leaderboard.id;
        if (!userScoreMap.has(leaderboardId)) {
          userScoreMap.set(leaderboardId, userScore);
        }
      }

      const filteredScores: Array<{ score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }> = [];

      for (const toSnipeScore of toSnipeScores) {
        const leaderboardId = toSnipeScore.leaderboard.id;
        const userScore = userScoreMap.get(leaderboardId);

        // Skip if the score is outside the accuracy range
        if (
          settings.accuracyRange &&
          (toSnipeScore.score.accuracy < settings.accuracyRange.min ||
            toSnipeScore.score.accuracy > settings.accuracyRange.max)
        ) {
          continue;
        }

        if (settings.requireBothScores) {
          // Only include if both players have scores AND toSnipe has a higher score
          if (!userScore) {
            continue;
          }
          const userScoreValue = userScore.score.score;
          const toSnipeScoreValue = toSnipeScore.score.score;
          if (toSnipeScoreValue > userScoreValue) {
            filteredScores.push(toSnipeScore);
          }
        } else {
          // Normal snipe behavior: include if user doesn't have a score OR toSnipe has a better score
          if (!userScore) {
            filteredScores.push(toSnipeScore);
          } else {
            const userScoreValue = userScore.score.score;
            const toSnipeScoreValue = toSnipeScore.score.score;
            if (toSnipeScoreValue > userScoreValue) {
              filteredScores.push(toSnipeScore);
            }
          }
        }
      }

      PlaylistService.sortPlaylistScoreRows(filteredScores, settings.sort, settings.sortDirection);

      const player = await PlayerCoreService.getAccount(toSnipe);
      if (!player) {
        throw new NotFoundError(
          `Unable to create a snipe playlist for ${toSnipe} as the user isn't tracked.`
        );
      }

      return {
        playlistTitle: `${truncateText(player.name ?? "", 16)} / ${capitalizeFirstLetter(settings.sort || "pp")} / ${settings.starRange?.min} - ${settings.starRange?.max} stars / ${settings.accuracyRange?.min} - ${settings.accuracyRange?.max}%`,
        playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
        customData: {
          syncURL: `${env.NEXT_PUBLIC_API_URL}/playlist/snipe?user=${user}&toSnipe=${toSnipe}&settings=${settingsBase64}`,
        },
        songs: filteredScores.map(({ leaderboard }) => ({
          songName: leaderboard.songName,
          levelAuthorName: leaderboard.songAuthorName,
          hash: leaderboard.songHash,
          difficulties: leaderboard.difficulties.map(difficulty => ({
            difficulty: difficulty.difficulty,
            characteristic: difficulty.characteristic,
          })),
        })),
      };
    } catch (error) {
      Logger.error("Error creating snipe playlist", error);
      throw new InternalServerError((error as Error).message);
    }
  }

  /**
   * Sorts playlist rows in memory (we already load the full filtered set from Postgres).
   */
  private static sortPlaylistScoreRows(
    rows: Array<{ score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }>,
    sort: SelfPlaylistSettings["sort"] | SnipeSettings["sort"] | undefined,
    sortDirection: SelfPlaylistSettings["sortDirection"] | SnipeSettings["sortDirection"] | undefined
  ): void {
    const field = sort ?? "pp";
    const dir = sortDirection ?? "desc";
    const mult = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = PlaylistService.scoreSortValue(a.score, field);
      const vb = PlaylistService.scoreSortValue(b.score, field);
      if (va !== vb) {
        return (va - vb) * mult;
      }
      return (a.score.scoreId - b.score.scoreId) * mult;
    });
  }

  private static scoreSortValue(score: ScoreSaberScore, field: string): number {
    switch (field) {
      case "pp":
        return score.pp;
      case "score":
        return score.score;
      case "acc":
        return score.accuracy;
      case "date":
        return score.timestamp.getTime();
      case "misses":
        return score.misses;
      case "maxcombo":
        return score.maxCombo;
      case "medals":
        return score.rank;
      default:
        return score.pp;
    }
  }

  /**
   * Loads ScoreSaber scores for a player with leaderboard rows from Postgres (replaces legacy Mongo aggregate + $lookup).
   */
  private static async fetchPlayerScoreSaberScoresWithLeaderboards(
    playerId: string,
    rankedStatus: SelfPlaylistSettings["rankedStatus"] | SnipeSettings["rankedStatus"],
    starRange: SelfPlaylistSettings["starRange"] | SnipeSettings["starRange"]
  ): Promise<Array<{ score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }>> {
    const conditions = [eq(scoreSaberScoresTable.playerId, playerId)];

    if (rankedStatus === "ranked") {
      conditions.push(gt(scoreSaberScoresTable.pp, 0));
    } else if (rankedStatus === "unranked") {
      conditions.push(lte(scoreSaberScoresTable.pp, 0));
    }

    if (rankedStatus === "ranked" && starRange.min !== undefined && starRange.max !== undefined) {
      conditions.push(isNotNull(scoreSaberLeaderboardsTable.stars));
      conditions.push(gte(scoreSaberLeaderboardsTable.stars, starRange.min));
      conditions.push(lte(scoreSaberLeaderboardsTable.stars, starRange.max));
    }

    const rows = await ScoreSaberScoresRepository.selectScoresJoinedLeaderboardsWhere(conditions);

    const leaderboardIds = [...new Set(rows.map(r => r.lbRow.id))];
    const leaderboardMap =
      await ScoreSaberLeaderboardsService.getLeaderboardsWithDifficultiesByIds(leaderboardIds);

    return rows.map(({ scoreRow, lbRow }) => {
      const leaderboard = leaderboardMap.get(lbRow.id);
      if (!leaderboard) {
        throw new InternalServerError(`Missing leaderboard ${lbRow.id} for playlist scores`);
      }
      return {
        score: scoreSaberScoreRowToType(scoreRow),
        leaderboard,
      };
    });
  }
}
