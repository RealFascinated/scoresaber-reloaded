import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardModel,
} from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore, ScoreSaberScoreModel } from "@ssr/common/model/score/impl/scoresaber-score";
import { Playlist, PlaylistModel } from "@ssr/common/playlist/playlist";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SnipePlaylist } from "@ssr/common/playlist/snipe/snipe-playlist";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { leaderboardToObject, playlistToObject } from "@ssr/common/utils/model-converters";
import { formatDate, formatDateMinimal, TimeUnit } from "@ssr/common/utils/time-utils";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { PlayerCoreService } from "../player/player-core.service";
import ScoreSaberService from "../scoresaber.service";

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
  public static PLAYLIST_IMAGE_BASE64 = "";

  constructor() {
    PlaylistService.init();
  }

  /**
   * Initializes the playlist service
   */
  private static async init() {
    this.PLAYLIST_IMAGE_BASE64 = `data:image/png;base64,${Buffer.from(await (await fetch("https://cdn.fascinated.cc/MW5WDvKW69.png")).arrayBuffer()).toString("base64")}`;
    Logger.info(`Loaded playlists image!`);

    for (const id of [
      "scoresaber-ranked-maps",
      "scoresaber-qualified-maps",
      "scoresaber-ranking-queue-maps",
    ] as PlaylistId[]) {
      if (!(await this.playlistExists(id))) {
        await this.createPlaylist(
          new Playlist(
            id,
            `${PLAYLIST_NAMES[id]} (${formatDate(new Date(), "Do MMMM, YYYY")})`,
            env.NEXT_PUBLIC_WEBSITE_NAME,
            this.PLAYLIST_IMAGE_BASE64,
            []
          )
        );

        Logger.info(`Created playlist ${id}!`);
      }
    }

    // Update the ranking queue playlist
    setInterval(
      async () => {
        const rankingQueue = await LeaderboardCoreService.getRankingQueueLeaderboards();
        await this.updatePlaylist("scoresaber-ranking-queue-maps", {
          title: `${PLAYLIST_NAMES["scoresaber-ranking-queue-maps"]} (${formatDate(new Date(), "Do MMMM, YYYY")})`,
          songs: rankingQueue.map(leaderboard => ({
            songName: leaderboard.songName,
            songAuthor: leaderboard.songAuthorName,
            songHash: leaderboard.songHash,
            difficulties: leaderboard.difficulties.map(difficulty => ({
              difficulty: difficulty.difficulty,
              characteristic: difficulty.characteristic,
            })),
          })),
        });
      },
      TimeUnit.toMillis(TimeUnit.Hour, 6)
    );
  }

  /**
   * Gets a playlist by ID
   *
   * @param playlistId the ID of the playlist to get
   * @returns the requested playlist
   */
  public static async getPlaylist(playlistId: PlaylistId | string): Promise<Playlist> {
    const playlist = await PlaylistModel.findOne({ id: playlistId }).lean();
    if (!playlist) {
      throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
    }
    return playlistToObject(playlist);
  }

  /**
   * Checks if a playlist exists
   *
   * @param playlistId the ID of the playlist to check
   * @returns true if the playlist exists, false otherwise
   */
  public static async playlistExists(playlistId: PlaylistId | string): Promise<boolean> {
    return (await PlaylistModel.exists({ id: playlistId })) !== null;
  }

  /**
   * Creates a playlist
   *
   * @param playlist the playlist to create
   */
  public static async createPlaylist(playlist: Playlist) {
    const existingPlaylist = await PlaylistModel.findOne({ id: playlist.id });
    if (existingPlaylist) {
      throw new BadRequestError(`Playlist with id ${playlist.id} already exists`);
    }

    await PlaylistModel.create(playlist);
    return playlist;
  }

  /**
   * Updates a playlist
   *
   * @param playlistId the ID of the playlist to update
   * @param updates the updates to apply
   */
  public static async updatePlaylist(playlistId: PlaylistId | string, updates: Partial<Playlist>) {
    const playlist = await PlaylistModel.findOne({ id: playlistId });
    if (!playlist) {
      throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
    }

    await PlaylistModel.updateOne({ id: playlistId }, updates);
    return playlist;
  }

  /**
   * Creates a playlist for custom ranked maps
   *
   * @param config the configuration for the custom ranked playlist
   * @returns the created custom ranked playlist
   */
  public static async createCustomRankedPlaylist(config?: string): Promise<Playlist> {
    if (!config) {
      throw new BadRequestError("Config is required for custom ranked playlists");
    }

    const parsedConfig = parseCustomRankedPlaylistSettings(config);
    const leaderboards = await ScoreSaberLeaderboardModel.find({
      ranked: true,
      stars: {
        $gte: parsedConfig.stars.min,
        $lte: parsedConfig.stars.max,
      },
    }).lean();

    const title = `Custom Ranked Maps (${formatDateMinimal(new Date())})`;

    return new Playlist(
      "scoresaber-custom-ranked-maps",
      title,
      env.NEXT_PUBLIC_WEBSITE_NAME,
      this.PLAYLIST_IMAGE_BASE64,
      leaderboards,
      "custom-ranked"
    );
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

      const sortField = settings.sort;
      const sortDirection = settings.sortDirection;

      // Map sort field names to actual property names on the score object
      const getSortValue = (score: ScoreSaberScore, field: string): number => {
        switch (field) {
          case "pp":
            return score.pp;
          case "score":
            return score.score;
          case "acc":
            return score.accuracy;
          case "date":
            return score.timestamp.getTime();
          default:
            return score.pp;
        }
      };

      async function getScores(playerId: string) {
        const pipeline = [
          {
            $match: {
              playerId: playerId,
            },
          },
          {
            $project: {
              pp: 1,
              accuracy: 1,
              timestamp: 1,
              leaderboardId: 1,
              playerId: 1,
              score: 1,
            },
          },
          {
            $lookup: {
              from: "scoresaber-leaderboards",
              localField: "leaderboardId",
              foreignField: "_id",
              as: "leaderboard",
            },
          },
          {
            $unwind: {
              path: "$leaderboard",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $match: {
              // Apply ranked status filtering
              ...(settings.rankedStatus === "ranked" ? { pp: { $gt: 0 } } : {}),
              ...(settings.rankedStatus === "unranked" ? { pp: { $lte: 0 } } : {}),
              // Apply star range filtering
              ...(settings.rankedStatus === "ranked" &&
              settings.starRange.min !== undefined &&
              settings.starRange.max !== undefined
                ? {
                    $and: [
                      { "leaderboard.stars": { $gte: settings.starRange.min } },
                      { "leaderboard.stars": { $lte: settings.starRange.max } },
                    ],
                  }
                : {}),
            },
          },
        ];

        const results = (await ScoreSaberScoreModel.aggregate(
          pipeline as Parameters<typeof ScoreSaberScoreModel.aggregate>[0]
        )) as Array<ScoreSaberScore & { leaderboard: ScoreSaberLeaderboard }>;

        if (results.length === 0) {
          throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
        }

        return results.map(result => ({
          score: {
            pp: result.pp,
            accuracy: result.accuracy,
            timestamp: result.timestamp,
            leaderboardId: result.leaderboardId,
            playerId: result.playerId,
            score: result.score,
          } as ScoreSaberScore,
          leaderboard: leaderboardToObject(result.leaderboard),
        }));
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

      const player = await ScoreSaberService.getPlayer(toSnipe, "basic");

      return new SnipePlaylist(
        toSnipe,
        user,
        settings,
        `${truncateText(player.name ?? "", 16)} / ${capitalizeFirstLetter(settings.sort || "pp")} / ${settings.starRange?.min} - ${settings.starRange?.max} stars / ${settings.accuracyRange?.min} - ${settings.accuracyRange?.max}%`,
        filteredScores
          .sort((a, b) => {
            const scoreA = a.score;
            const scoreB = b.score;
            const valueA = getSortValue(scoreA, sortField);
            const valueB = getSortValue(scoreB, sortField);
            return sortDirection === "desc" ? valueB - valueA : valueA - valueB;
          })
          .map(({ leaderboard }) => leaderboard),
        this.PLAYLIST_IMAGE_BASE64
      );
    } catch (error) {
      Logger.error("Error creating snipe playlist", error);
      throw new InternalServerError((error as Error).message);
    }
  }
}
