import { ImageResponse } from "@vercel/og";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import React from "react";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficultyFromScoreSaberDifficulty } from "@ssr/common/utils/scoresaber-utils";
import { StarIcon } from "../../components/star-icon";
import { GlobeIcon } from "../../components/globe-icon";
import NodeCache from "node-cache";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

const cache = new NodeCache({
  stdTTL: 60 * 60, // 1 hour
  checkperiod: 120,
});

export class ImageService {
  /**
   * The base of the OpenGraph image
   *
   * @param children the content of the image
   * @private
   */
  public static BaseImage({ children }: { children: React.ReactNode }) {
    return (
      <div
        tw="w-full h-full flex flex-col text-white text-3xl p-3 justify-center items-center"
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
    const cacheKey = `player-${id}`;
    let player: undefined | ScoreSaberPlayerToken;
    if (cache.has(cacheKey)) {
      player = cache.get<ScoreSaberPlayerToken>(cacheKey);
    } else {
      player = await scoresaberService.lookupPlayer(id);
      if (player != undefined) {
        cache.set(cacheKey, player);
      }
    }
    if (player == undefined) {
      return undefined;
    }

    return new ImageResponse(
      (
        <ImageService.BaseImage>
          <img src={player.profilePicture} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />
          <div tw="flex flex-col pl-3 items-center">
            <p tw="font-bold text-6xl m-0">{player.name}</p>
            <p tw="text-[#606fff] m-0">{formatPp(player.pp)}pp</p>
            <div tw="flex">
              <div tw="flex px-2 justify-center items-center">
                <GlobeIcon />
                <p tw="m-0">#{formatNumberWithCommas(player.rank)}</p>
              </div>
              <div tw="flex items-center px-2 justify-center items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://ssr.fascinated.cc/assets/flags/${player.country.toLowerCase()}.png`}
                  height={20}
                  alt="Player's Country"
                />
                <p tw="pl-1 m-0">#{formatNumberWithCommas(player.countryRank)}</p>
              </div>
            </div>
          </div>
        </ImageService.BaseImage>
      ),
      {
        width: 1200,
        height: 630,
        emoji: "twemoji",
      }
    );
  }

  /**
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generateLeaderboardImage(id: string) {
    const cacheKey = `leaderboard-${id}`;
    let leaderboard: undefined | ScoreSaberLeaderboardToken;
    if (cache.has(cacheKey)) {
      leaderboard = cache.get(cacheKey) as ScoreSaberLeaderboardToken;
    } else {
      leaderboard = await scoresaberService.lookupLeaderboard(id);
      if (leaderboard != undefined) {
        cache.set(cacheKey, leaderboard);
      }
    }
    if (leaderboard == undefined) {
      return undefined;
    }

    const ranked = leaderboard.stars > 0;
    return new ImageResponse(
      (
        <ImageService.BaseImage>
          <img src={leaderboard.coverImage} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />
          <p tw="font-bold text-6xl m-0">
            {leaderboard.songName} {leaderboard.songSubName}
          </p>
          <div tw="flex justify-center items-center text-center">
            {ranked && (
              <div tw="flex justify-center items-center text-4xl">
                <p tw="font-bold m-0">{leaderboard.stars}</p>
                <StarIcon />
              </div>
            )}
            <p tw={"font-bold m-0 text-4xl" + (ranked ? " pl-3" : "")}>
              {getDifficultyFromScoreSaberDifficulty(leaderboard.difficulty.difficulty)}
            </p>
          </div>
          <p tw="font-bold text-2xl text-gray-400 m-0">Mapped by {leaderboard.levelAuthorName}</p>
        </ImageService.BaseImage>
      ),
      {
        width: 1200,
        height: 630,
        emoji: "twemoji",
      }
    );
  }
}
