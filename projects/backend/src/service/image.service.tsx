import { DetailType } from "@ssr/common/detail-type";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ImageResponse } from "@vercel/og";
import { NotFoundError } from "elysia";
import React from "react";
import { GlobeIcon } from "../../components/globe-icon";
import { StarIcon } from "../../components/star-icon";
import LeaderboardService from "./leaderboard.service";
import ScoreSaberService from "./scoresaber.service";

const imageOptions = {
  width: 1200,
  height: 630,
  fonts: [{ name: "Roboto", data: await Bun.file("./src/common/font/Roboto-Medium.ttf").arrayBuffer() }],
};

export class ImageService {
  /**
   * The base of the OpenGraph image
   *
   * @param children the content of the image
   */
  public static BaseEmbedImage({ children }: { children: React.ReactNode }) {
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
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generatePlayerImage(id: string) {
    const player = await ScoreSaberService.getPlayer(id, DetailType.BASIC);
    if (!player) {
      throw new NotFoundError(`Player "${id}" not found`);
    }

    return new ImageResponse(
      (
        <ImageService.BaseEmbedImage>
          {/* Player Avatar */}
          <img src={player.avatar} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />

          {/* Player Stats */}
          <div tw="flex flex-col pl-3 items-center">
            {/* Player Name */}
            <p tw="font-bold text-6xl m-0">{player.name}</p>

            {/* Player PP */}
            <div tw="flex justify-center items-center text-[33px]">
              <p tw="text-[#4858ff] m-0">{formatPp(player.pp)}pp</p>
            </div>

            {/* Player Stats */}
            <div tw="flex">
              {/* Player Rank */}
              <div tw="flex px-2 justify-center items-center">
                <GlobeIcon />
                <p tw="m-0">#{formatNumberWithCommas(player.rank)}</p>
              </div>

              {/* Player Country Rank */}
              <div tw="flex px-2 justify-center items-center">
                <img
                  src={`https://ssr.fascinated.cc/assets/flags/${player.country.toLowerCase()}.png`}
                  height={20}
                  alt="Player's Country"
                />
                <p tw="pl-1 m-0">#{formatNumberWithCommas(player.countryRank)}</p>
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
        </ImageService.BaseEmbedImage>
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
    const response = await LeaderboardService.getLeaderboard(id);
    if (!response) {
      return undefined;
    }
    const { leaderboard } = response;
    const ranked = leaderboard.stars > 0;

    return new ImageResponse(
      (
        <ImageService.BaseEmbedImage>
          {/* Leaderboard Cover Image */}
          <img src={leaderboard.songArt} width={256} height={256} alt="Leaderboard Cover" tw="rounded-full mb-3" />

          {/* Leaderboard Name */}
          <p tw="font-bold text-6xl m-0">{leaderboard.fullName}</p>

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
        </ImageService.BaseEmbedImage>
      ),
      imageOptions
    );
  }
}
