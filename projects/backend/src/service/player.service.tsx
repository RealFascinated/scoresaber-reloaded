import { PlayerDocument, PlayerModel } from "../model/player";
import { NotFoundError } from "../error/not-found-error";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { InternalServerError } from "../error/internal-server-error";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
import { ImageResponse } from "@vercel/og";
import { formatNumberWithCommas, formatPp } from "website/src/common/number-utils";
import { config } from "website/config";
import React from "react";

export class PlayerService {
  /**
   * Get a player from the database.
   *
   * @param id the player to fetch
   * @param create if true, create the player if it doesn't exist
   * @param playerToken an optional player token for the player
   * @returns the player
   * @throws NotFoundError if the player is not found
   */
  public static async getPlayer(
    id: string,
    create: boolean = false,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<PlayerDocument> {
    let player: PlayerDocument | null = await PlayerModel.findById(id);
    if (player === null) {
      // If create is on, create the player, otherwise return unknown player
      playerToken = create ? (playerToken ? playerToken : await scoresaberService.lookupPlayer(id)) : undefined;
      if (playerToken === undefined) {
        throw new NotFoundError(`Player "${id}" not found`);
      }

      console.log(`Creating player "${id}"...`);
      try {
        player = (await PlayerModel.create({ _id: id })) as PlayerDocument;
        player.trackedSince = new Date();
        await this.seedPlayerHistory(player, playerToken);
      } catch (err) {
        const message = `Failed to create player document for "${id}"`;
        console.log(message, err);
        throw new InternalServerError(message);
      }
    }
    return player;
  }

  /**
   * Seeds the player's history using data from
   * the ScoreSaber API.
   *
   * @param player the player to seed
   * @param playerToken the SoreSaber player token
   */
  public static async seedPlayerHistory(player: PlayerDocument, playerToken: ScoreSaberPlayerToken): Promise<void> {
    // Loop through rankHistory in reverse, from current day backwards
    const playerRankHistory = playerToken.histories.split(",").map((value: string) => {
      return parseInt(value);
    });
    playerRankHistory.push(playerToken.rank);

    let daysAgo = 1; // Start from yesterday
    for (let i = playerRankHistory.length - daysAgo - 1; i >= 0; i--) {
      const rank = playerRankHistory[i];
      const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
      player.setStatisticHistory(date, {
        rank: rank,
      });
      daysAgo += 1; // Increment daysAgo for each earlier rank
    }
    await player.save();
  }

  /**
   * Tracks a players statistics
   *
   * @param foundPlayer the player to track
   * @param playerToken an optional player token
   */
  public static async trackScoreSaberPlayer(
    foundPlayer: PlayerDocument,
    playerToken?: ScoreSaberPlayerToken
  ): Promise<void> {
    const dateToday = getMidnightAlignedDate(new Date());
    const player = playerToken ? playerToken : await scoresaberService.lookupPlayer(foundPlayer.id);
    if (player == undefined) {
      console.log(`Player "${foundPlayer.id}" not found on ScoreSaber`);
      return;
    }
    if (player.inactive) {
      console.log(`Player "${foundPlayer.id}" is inactive on ScoreSaber`);
      return;
    }

    // Seed the history with ScoreSaber data if no history exists
    if (foundPlayer.getDaysTracked() === 0) {
      await this.seedPlayerHistory(foundPlayer, player);
    }

    // Update current day's statistics
    let history = foundPlayer.getHistoryByDate(dateToday);
    if (history == undefined) {
      history = {}; // Initialize if history is not found
    }
    // Set the history data
    history.pp = player.pp;
    history.countryRank = player.countryRank;
    history.rank = player.rank;
    history.accuracy = {
      averageRankedAccuracy: player.scoreStats.averageRankedAccuracy,
    };
    foundPlayer.setStatisticHistory(dateToday, history);
    foundPlayer.sortStatisticHistory();
    foundPlayer.lastTracked = new Date();
    await foundPlayer.save();

    console.log(`Tracked player "${foundPlayer.id}"!`);
  }

  /**
   * Track player score.
   *
   * @param score the score to track
   * @param leaderboard the leaderboard to track
   */
  public static async trackScore({ score, leaderboard }: ScoreSaberPlayerScoreToken) {
    const playerId = score.leaderboardPlayerInfo.id;
    const playerName = score.leaderboardPlayerInfo.name;
    const player: PlayerDocument | null = await PlayerModel.findById(playerId);
    // Player is not tracked, so ignore the score.
    if (player == undefined) {
      return;
    }

    const today = new Date();
    let history = player.getHistoryByDate(today);
    if (history == undefined || Object.keys(history).length === 0) {
      history = { scores: { rankedScores: 0, unrankedScores: 0 } }; // Ensure initialization
    }

    const scores = history.scores || {};
    if (leaderboard.stars > 0) {
      scores.rankedScores!++;
    } else {
      scores.unrankedScores!++;
    }

    history.scores = scores;
    player.setStatisticHistory(today, history);
    player.sortStatisticHistory();

    // Save the changes
    player.markModified("statisticHistory");
    await player.save();

    console.log(
      `Updated scores set statistic for "${playerName}"(${playerId}), scores today: ${scores.rankedScores} ranked, ${scores.unrankedScores} unranked`
    );
  }

  /**
   * Generates the OpenGraph image for the player
   *
   * @param id the player's id
   */
  public static async generateOpenGraphImage(id: string) {
    const player = await scoresaberService.lookupPlayer(id);
    if (player == undefined) {
      return undefined;
    }
    return new ImageResponse(
      (
        <div tw="w-full h-full flex flex-col text-white bg-black text-3xl p-3 justify-center items-center">
          <img src={player.profilePicture} width={256} height={256} alt="Player's Avatar" tw="rounded-full" />
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
                  src={`${config.siteUrl}/assets/flags/${player.country.toLowerCase()}.png`}
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
  }
}
