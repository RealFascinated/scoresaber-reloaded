import { Playlist } from "@ssr/common/playlist/playlist";
import LeaderboardService from "./leaderboard.service";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import SSRImage, { ImageTextOptions } from "../common/ssr-image";
import { PlayerService } from "./player.service";
import ScoreSaberService from "./scoresaber.service";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";

export type SnipeType = "top" | "recent";

export default class PlaylistService {
  /**
   * Gets a playlist
   *
   * @param playlistId
   * @returns the playlist
   */
  public static async getPlaylist(playlistId: string): Promise<Playlist> {
    switch (playlistId) {
      case "scoresaber-ranked-maps": {
        return await this.createRankedMapsPlaylist();
      }
      case "scoresaber-qualified-maps": {
        return await this.createQualifiedMapsPlaylist();
      }
      case "scoresaber-ranking-queue-maps": {
        return await this.createRankingQueueMapsPlaylist();
      }
      default: {
        throw new NotFoundError(`Playlist with id ${playlistId} does not exist`);
      }
    }
  }

  /**
   * Creates a playlist for a snipe.
   *
   * @param user the user who is sniping
   * @param toSnipe the user who is being sniped
   * @param type the type of snipe
   * @param settingsBase64 the settings to use for the playlist
   * @returns the playlist
   */
  public static async getSnipePlaylist(
    user: string,
    toSnipe: string,
    type: SnipeType,
    settingsBase64?: string
  ): Promise<Playlist> {
    const settings = settingsBase64
      ? (JSON.parse(Buffer.from(settingsBase64, "base64").toString()) as SnipeSettings)
      : undefined;
    type = settings?.sort ?? "top";
    const limit = (settings?.limit > 250 ? 250 : settings?.limit) ?? 100;

    // validate type
    if (type !== "top" && type !== "recent") {
      throw new BadRequestError("Invalid snipe type");
    }

    try {
      if (!(await PlayerService.playerExists(user)) || !(await PlayerService.playerExists(toSnipe))) {
        throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as one of the users isn't tracked.`);
      }

      const rawScores = await ScoreSaberService.getPlayerScores(toSnipe);
      if (rawScores.length === 0) {
        throw new NotFoundError(`Unable to create a snipe playlist for ${toSnipe} as they have no scores.`);
      }

      const scores: { score: ScoreSaberScore; leaderboard: ScoreSaberLeaderboard }[] = [];
      for (const rawScore of rawScores) {
        const score = rawScore as ScoreSaberScore;
        const leaderboardResponse = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>(
          "scoresaber",
          score.leaderboardId + "",
          {
            cacheOnly: true,
            includeBeatSaver: false,
          }
        );
        if (!leaderboardResponse) {
          continue; // Skip this score if no leaderboardResponse is found
        }
        const { leaderboard } = leaderboardResponse;

        if (settings?.starRange?.min && settings?.starRange?.max && leaderboard.ranked) {
          if (leaderboard.stars < settings.starRange.min || leaderboard.stars > settings.starRange.max) {
            continue; // Skip this score if it's not in the star range
          }
        }

        if (settings?.accuracyRange?.min && settings?.accuracyRange?.max) {
          if (score.accuracy < settings.accuracyRange.min || score.accuracy > settings.accuracyRange.max) {
            continue; // Skip this score if it's not in the accuracy range
          }
        }

        scores.push({
          score: score,
          leaderboard: leaderboard,
        });
      }

      const toSnipePlayer = await ScoreSaberService.getPlayer(toSnipe);
      return new Playlist(
        "scoresaber-snipe-" + toSnipe,
        `Snipe - ${truncateText(toSnipePlayer.name, 16)} (${capitalizeFirstLetter(type)})`,
        "ScoreSaber Reloaded",
        await this.generatePlaylistImage("SSR", {
          lines: [
            {
              text: "Snipe",
              color: "#222222",
              fontSize: 55,
              fontFamily: "SSR",
            },
            {
              text: truncateText(toSnipePlayer.name, 16)!,
              color: "#222222",
              fontSize: 45,
              fontFamily: "SSR",
            },
          ],
        }),
        scores
          .sort((a, b) => {
            if (settings?.sort === "top") {
              return b.score.pp - a.score.pp;
            } else {
              return b.score.timestamp.getTime() - a.score.timestamp.getTime();
            }
          })
          .slice(0, limit)
          .map(({ score, leaderboard }) => {
            return {
              songName: leaderboard.songName,
              songAuthor: leaderboard.songAuthorName,
              songHash: leaderboard.songHash,
              difficulties: leaderboard.difficulties
                .filter(difficulty => difficulty.leaderboardId === score.leaderboardId)
                .map(difficulty => {
                  return {
                    difficulty: difficulty.difficulty,
                    characteristic: difficulty.characteristic,
                  };
                }),
            };
          }),
        () => `snipe/?user=${user}&toSnipe=${toSnipe}&type=${type}&settings=${settingsBase64}`
      );
    } catch (error) {
      console.error("Error creating snipe playlist", error);
      throw new InternalServerError((error as Error).message);
    }
  }

  /**
   * Creates a playlist with all ranked maps.
   * @private
   */
  public static async createRankedMapsPlaylist(): Promise<Playlist> {
    const rankedLeaderboards = await LeaderboardService.getRankedLeaderboards();
    const highlightedIds = rankedLeaderboards.map(map => map.id);

    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of rankedLeaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-ranked-maps",
      `ScoreSaber Ranked Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Ranked",
      })
    );
  }

  /**
   * Creates a playlist with all ranked maps.
   * @private
   */
  public static async createQualifiedMapsPlaylist(): Promise<Playlist> {
    const qualifiedLeaderboards = await LeaderboardService.getQualifiedLeaderboards();
    let highlightedIds = [...qualifiedLeaderboards.map(map => map.id)];
    for (const map of qualifiedLeaderboards) {
      if (map.ranked) {
        continue;
      }
      for (const difficulty of map.difficulties) {
        highlightedIds.push(difficulty.leaderboardId);
      }
    }
    // Remove duplicates
    highlightedIds = [...new Set(highlightedIds)];

    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of qualifiedLeaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-qualified-maps",
      `ScoreSaber Qualified Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Qualified",
      })
    );
  }

  /**
   * Creates a playlist with all the maps in the ranking queue.
   * @private
   */
  public static async createRankingQueueMapsPlaylist(): Promise<Playlist> {
    const leaderboards: ScoreSaberLeaderboard[] = await fetchWithCache(
      CacheService.getCache(ServiceCache.Leaderboards),
      "ranking-queue-maps",
      async () => {
        const rankingQueueTokens = (await scoresaberService.lookupRankingRequests()) || [];

        const leaderboards: ScoreSaberLeaderboard[] = [];
        for (const rankingQueueToken of rankingQueueTokens) {
          const leaderboard = getScoreSaberLeaderboardFromToken(rankingQueueToken.leaderboardInfo);
          leaderboards.push(leaderboard);
        }

        return leaderboards;
      }
    );

    const highlightedIds = leaderboards.map(map => map.id);
    const maps: Map<string, ScoreSaberLeaderboard> = new Map();
    for (const leaderboard of leaderboards) {
      if (maps.has(leaderboard.songHash)) {
        continue;
      }
      maps.set(leaderboard.songHash, leaderboard);
    }

    return this.createScoreSaberPlaylist(
      "scoresaber-ranking-queue-maps",
      `ScoreSaber Ranking Queue Maps (${formatDateMinimal(new Date())})`,
      "ScoreSaber Reloaded",
      maps,
      highlightedIds,
      await this.generatePlaylistImage("SSR", {
        title: "Ranking Queue",
      })
    );
  }

  /**
   * Creates a ScoreSaber playlist
   *
   * @param id the id of the playlist
   * @param title the title of the playlist
   * @param author the author of the playlist
   * @param maps the maps in the playlist
   * @param selectedDifficulties the leaderboard ids to highlight
   * @param image the image for the playlist
   * @returns the playlist
   * @private
   */
  private static createScoreSaberPlaylist(
    id: string,
    title: string,
    author: string,
    maps: Map<string, ScoreSaberLeaderboard>,
    selectedDifficulties: number[],
    image: string
  ) {
    const uniqueMaps = new Map<string, ScoreSaberLeaderboard>();
    for (const map of maps.values()) {
      const mapId = map.songHash;
      if (!uniqueMaps.has(mapId)) {
        uniqueMaps.set(mapId, map);
      }
    }

    return new Playlist(
      id,
      title,
      author,
      image,
      Array.from(uniqueMaps.values()).map(map => {
        return {
          songName: map.songName,
          songAuthor: map.songAuthorName,
          songHash: map.songHash,
          difficulties: map.difficulties
            .filter(difficulty => selectedDifficulties.includes(difficulty.leaderboardId))
            .map(difficulty => {
              return {
                difficulty: difficulty.difficulty,
                characteristic: difficulty.characteristic,
              };
            }),
        };
      })
    );
  }

  /**
   * Generates a playlist image
   *
   * @param author the author of the playlist
   * @param options the options for the playlist image
   * @returns the base64 encoded image
   */
  private static async generatePlaylistImage(
    author: string,
    options: {
      title?: string;
      lines?: ImageTextOptions[];
    }
  ): Promise<string> {
    const image = new SSRImage({
      width: 512,
      height: 512,
    });
    await image.setBackgroundImage("https://cdn.fascinated.cc/cFkchQkc.png");
    image.drawText(
      [
        {
          text: author,
          color: "#000",
          fontSize: 100,
          fontFamily: "SSR",
        },
        // Title
        ...(options.title
          ? ([
              {
                text: options.title,
                color: "#222222",
                fontSize: 62,
                fontFamily: "SSR",
              },
            ] as ImageTextOptions[])
          : []),

        // Additional lines
        ...(options.lines || []),
      ],
      "center",
      0.8
    );
    return (await image.build()).toString("base64");
  }
}
