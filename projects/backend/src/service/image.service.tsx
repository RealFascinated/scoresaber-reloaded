import { ImageResponse } from "@vercel/og";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import React from "react";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficultyFromScoreSaberDifficulty } from "website/src/common/scoresaber-utils";
import NodeCache from "node-cache";

const imageCache = new NodeCache({
  stdTTL: 60 * 60, // 1 hour
  checkperiod: 120,
});

export class ImageService {
  /**
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generatePlayerImage(id: string) {
    const cacheKey = `player-${id}`;
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey) as ImageResponse;
    }

    const player = await scoresaberService.lookupPlayer(id);
    if (player == undefined) {
      return undefined;
    }
    const imageResponse = new ImageResponse(
      (
        <div
          tw="w-full h-full flex flex-col text-white text-3xl p-3 justify-center items-center"
          style={{
            backgroundColor: "#0a0a0a",
            background: "radial-gradient(ellipse 60% 60% at 50% -20%, rgba(120,119,198,0.15), rgba(255,255,255,0))",
          }}
        >
          <img src={player.profilePicture} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />
          <div tw="flex flex-col pl-3 items-center">
            <p tw="font-bold text-6xl m-0">{player.name}</p>
            <p tw="text-[#606fff] m-0">{formatPp(player.pp)}pp</p>
            <div tw="flex">
              <div tw="flex px-2 justify-center items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 26"
                  fill="currentColor"
                  style={{
                    width: "33px",
                    height: "33px",
                    paddingRight: "3px",
                  }}
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM6.262 6.072a8.25 8.25 0 1 0 10.562-.766 4.5 4.5 0 0 1-1.318 1.357L14.25 7.5l.165.33a.809.809 0 0 1-1.086 1.085l-.604-.302a1.125 1.125 0 0 0-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 0 1-2.288 4.04l-.723.724a1.125 1.125 0 0 1-1.298.21l-.153-.076a1.125 1.125 0 0 1-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 0 1-.21-1.298L9.75 12l-1.64-1.64a6 6 0 0 1-1.676-3.257l-.172-1.03Z"
                    clipRule="evenodd"
                  />
                </svg>
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
        </div>
      ),
      {
        width: 1200,
        height: 630,
        emoji: "twemoji",
      }
    );
    imageCache.set(cacheKey, imageResponse);
    return imageResponse;
  }

  /**
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generateLeaderboardImage(id: string) {
    const cacheKey = `leaderboard-${id}`;
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey) as ImageResponse;
    }

    const leaderboard = await scoresaberService.lookupLeaderboard(id);
    if (leaderboard == undefined) {
      return undefined;
    }

    const ranked = leaderboard.stars > 0;
    const imageResponse = new ImageResponse(
      (
        <div
          tw="w-full h-full flex flex-col text-white text-3xl p-3 justify-center items-center"
          style={{
            backgroundColor: "#0a0a0a",
            background: "radial-gradient(ellipse 60% 60% at 50% -20%, rgba(120,119,198,0.15), rgba(255,255,255,0))",
          }}
        >
          <img src={leaderboard.coverImage} width={256} height={256} alt="Player's Avatar" tw="rounded-full mb-3" />
          <p tw="font-bold text-6xl m-0">
            {leaderboard.songName} {leaderboard.songSubName}
          </p>
          <div tw="flex justify-center items-center text-center">
            {ranked && (
              <div tw="flex justify-center items-center text-4xl">
                <p tw="font-bold m-0">{leaderboard.stars}</p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{
                    width: "40px",
                    height: "40px",
                    paddingRight: "3px",
                  }}
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            <p tw={"font-bold m-0 text-4xl" + (ranked ? " pl-3" : "")}>
              {getDifficultyFromScoreSaberDifficulty(leaderboard.difficulty.difficulty)}
            </p>
          </div>
          <p tw="font-bold text-2xl text-gray-400 m-0">Mapped by {leaderboard.levelAuthorName}</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        emoji: "twemoji",
      }
    );

    imageCache.set(cacheKey, imageResponse);
    return imageResponse;
  }
}
