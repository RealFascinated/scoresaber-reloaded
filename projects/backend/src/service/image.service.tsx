import { ImageResponse } from "@vercel/og";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import React from "react";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { StarIcon } from "../../components/star-icon";
import { GlobeIcon } from "../../components/globe-icon";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Jimp } from "jimp";
import { extractColors } from "extract-colors";
import { Config } from "@ssr/common/config";
import { fetchWithCache } from "../common/cache.util";
import { getScoreSaberPlayerFromToken } from "@ssr/common/token-creators";
import LeaderboardService from "./leaderboard.service";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { NotFoundError } from "elysia";
import CacheService, { ServiceCache } from "./cache.service";

const imageOptions = { width: 1200, height: 630 };

export class ImageService {
  /**
   * Gets the average color of an image
   *
   * @param src the image url
   * @returns the average color
   * @private
   */
  public static async getAverageImageColor(src: string): Promise<{ color: string } | undefined> {
    src = decodeURIComponent(src);

    return await fetchWithCache<{ color: string }>(
      CacheService.getCache(ServiceCache.EmbedImages),
      `average-color:${src}`,
      async () => {
        try {
          const image = await Jimp.read(src); // Load image using Jimp
          const { width, height, data } = image.bitmap; // Access image dimensions and pixel data

          // Convert the Buffer data to Uint8ClampedArray
          const uint8ClampedArray = new Uint8ClampedArray(data);

          // Extract the colors using extract-colors
          const colors = await extractColors({ data: uint8ClampedArray, width, height });

          // Return the most dominant color, or fallback if none found
          if (colors && colors.length > 0) {
            return { color: colors[2].hex }; // Returning the third most dominant color
          }

          return {
            color: "#fff", // Fallback color in case no colors are found
          };
        } catch (error) {
          console.error("Error fetching image or extracting colors:", error);
          return {
            color: "#fff", // Fallback color in case of an error
          };
        }
      }
    );
  }

  /**
   * The base of the OpenGraph image
   *
   * @param children the content of the image
   */
  public static BaseImage({ children }: { children: React.ReactNode }) {
    return (
      <div
        tw="w-full h-full flex flex-col text-white text-3xl p-3 justify-center items-center relative"
        style={{
          backgroundColor: "#0a0a0a",
          background: "radial-gradient(ellipse 60% 60% at 50% -20%, rgba(120,119,198,0.15), rgba(255,255,255,0))",
        }}
      >
        {children}
      </div>
    );
  }

  /**
   * Renders the change for a stat.
   *
   * @param change the amount of change
   * @param format the function to format the value
   */
  private static renderDailyChange(change: number, format: (value: number) => string = formatNumberWithCommas) {
    if (change === 0) {
      return null;
    }

    return (
      <p tw={`text-[23px] pl-1 m-0 ${change > 0 ? "text-green-400" : "text-red-400"}`}>
        {change > 0 ? "+" : ""}
        {format(change)}
      </p>
    );
  }

  /**
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generatePlayerImage(id: string) {
    const player = await fetchWithCache<ScoreSaberPlayer | undefined>(
      CacheService.getCache(ServiceCache.ScoreSaberPlayer),
      `player:${id}`,
      async () => {
        const token = await scoresaberService.lookupPlayer(id);
        return token ? await getScoreSaberPlayerFromToken(token, Config.apiUrl) : undefined;
      }
    );
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    const { statisticChange } = player;
    const { daily } = statisticChange ?? {};
    const rankChange = daily?.countryRank ?? 0;
    const countryRankChange = daily?.rank ?? 0;
    const ppChange = daily?.pp ?? 0;

    return new ImageResponse(
      (
        <ImageService.BaseImage>
          {/* Player Avatar */}
          <img src={player.avatar} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />

          {/* Player Stats */}
          <div tw="flex flex-col pl-3 items-center">
            {/* Player Name */}
            <p tw="font-bold text-6xl m-0">{player.name}</p>

            {/* Player PP */}
            <div tw="flex justify-center items-center text-[33px]">
              <p tw="text-[#4858ff] m-0">{formatPp(player.pp)}pp</p>
              {this.renderDailyChange(ppChange)}
            </div>

            {/* Player Stats */}
            <div tw="flex">
              {/* Player Rank */}
              <div tw="flex px-2 justify-center items-center">
                <GlobeIcon />
                <p tw="m-0">#{formatNumberWithCommas(player.rank)}</p>
                {this.renderDailyChange(rankChange)}
              </div>

              {/* Player Country Rank */}
              <div tw="flex px-2 justify-center items-center">
                <img
                  src={`https://ssr.fascinated.cc/assets/flags/${player.country.toLowerCase()}.png`}
                  height={20}
                  alt="Player's Country"
                />
                <p tw="pl-1 m-0">#{formatNumberWithCommas(player.countryRank)}</p>
                {this.renderDailyChange(countryRankChange)}
              </div>
            </div>

            {/* Joined Date */}
            <p tw="m-0 text-gray-400 mt-2">
              Joined ScoreSaber in{" "}
              {player.joinedDate.toLocaleString("en-US", {
                timeZone: "Europe/London",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </ImageService.BaseImage>
      ),
      imageOptions
    );
  }

  /**
   * Generates the OpenGraph image for the leaderboard
   *
   * @param id the leaderboard's id
   */
  public static async generateLeaderboardImage(id: string) {
    const response = await LeaderboardService.getLeaderboard<ScoreSaberLeaderboard>("scoresaber", id);
    if (!response) {
      return undefined;
    }
    const { leaderboard } = response;

    const ranked = leaderboard.stars > 0;

    return new ImageResponse(
      (
        <ImageService.BaseImage>
          {/* Leaderboard Cover Image */}
          <img src={leaderboard.songArt} width={256} height={256} alt="Leaderboard Cover" tw="rounded-full mb-3" />

          {/* Leaderboard Name */}
          <p tw="font-bold text-6xl m-0">
            {leaderboard.songName} {leaderboard.songSubName}
          </p>

          <div tw="flex justify-center items-center text-center">
            {/* Leaderboard Stars */}
            {ranked && (
              <div tw="flex justify-center items-center text-4xl">
                <p tw="font-bold m-0">{leaderboard.stars}</p>
                <StarIcon />
              </div>
            )}

            {/* Leaderboard Difficulty */}
            <p tw={"font-bold m-0 text-4xl" + (ranked ? " pl-3" : "")}>{leaderboard.difficulty.difficulty}</p>
          </div>

          {/* Leaderboard Author */}
          <p tw="font-bold text-2xl text-gray-400 m-0 mt-2">Mapped by {leaderboard.levelAuthorName}</p>
        </ImageService.BaseImage>
      ),
      imageOptions
    );
  }
}
