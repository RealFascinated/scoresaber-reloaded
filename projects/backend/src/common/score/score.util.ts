import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import BeatSaverService from "../../service/beatsaver.service";
import { DetailType } from "@ssr/common/detail-type";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { PreviousScoresService } from "../../service/score/previous-scores.service";
import { formatChange } from "@ssr/common/utils/utils";
import { DiscordChannels } from "../../bot/bot";
import { Config } from "@ssr/common/config";
import { logToChannel } from "../../bot/bot";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { EmbedBuilder } from "discord.js";
import { formatPp } from "@ssr/common/utils/number-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { fetchWithCache } from "../cache.util";
import CacheService from "../../service/cache.service";
import { ServiceCache } from "../../service/cache.service";

/**
 * Converts a database score to a ScoreSaberScore.
 *
 * @param score the score to convert
 * @returns the converted score
 */
export function scoreToObject(score: ScoreSaberScore): ScoreSaberScore {
  return {
    ...removeObjectFields<ScoreSaberScore>(score, ["_id", "__v"]),
    id: score._id,
  } as ScoreSaberScore;
}

/**
 * Sends a score notification to the number one feed.
 *
 * @param score the score to send
 * @param leaderboard the leaderboard the score was set on
 * @param title the title of the notification
 */
export async function sendScoreNotification(
  channel: DiscordChannels,
  score: ScoreSaberScore,
  leaderboard: ScoreSaberLeaderboard,
  title: string
) {
  const beatSaver = await BeatSaverService.getMap(
    leaderboard.songHash,
    leaderboard.difficulty.difficulty,
    leaderboard.difficulty.characteristic,
    DetailType.BASIC
  );
  const player = await fetchWithCache(
    CacheService.getCache(ServiceCache.Players),
    `scoresaber-player:${score.playerId}`,
    async () => {
      return await scoresaberService.lookupPlayer(score.playerId);
    }
  );
  if (!player) {
    return;
  }

  const previousScore = await PreviousScoresService.getPreviousScore(
    player.id,
    score,
    leaderboard,
    score.timestamp
  );
  const change = previousScore &&
    previousScore.change && {
      accuracy: `${formatChange(previousScore.change.accuracy, value => value.toFixed(2) + "%") || ""}`,
      pp: `${formatChange(previousScore.change.pp, undefined, true) || ""}`,
      misses: previousScore.misses == score.misses ? "" : ` vs ${previousScore.misses}` || "",
      badCuts: previousScore.badCuts == score.badCuts ? "" : ` vs ${previousScore.badCuts}` || "",
      maxCombo:
        previousScore.maxCombo == score.maxCombo ? "" : ` vs ${previousScore.maxCombo}` || "",
    };

  const message = await logToChannel(
    channel,
    new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        [
          `${leaderboard.fullName} (${getDifficultyName(leaderboard.difficulty.difficulty)} ${leaderboard.stars.toFixed(2)}★)`,
          [
            `[[Player]](${Config.websiteUrl}/player/${player.id})`,
            `[[Leaderboard]](${Config.websiteUrl}/leaderboard/${leaderboard.id})`,
            beatSaver ? `[[Map]](https://beatsaver.com/maps/${beatSaver.bsr})` : undefined,
          ].join(" "),
        ]
          .join("\n")
          .trim()
      )
      .addFields([
        {
          name: "Accuracy",
          value: `${formatScoreAccuracy(score)} ${change ? change.accuracy : ""}`,
          inline: true,
        },
        {
          name: "PP",
          value: `${formatPp(score.pp)}pp ${change ? change.pp : ""}`,
          inline: true,
        },
        {
          name: "Player Rank",
          value: `#${formatNumberWithCommas(player.rank)}`,
          inline: true,
        },
        {
          name: "Misses",
          value: `${formatNumberWithCommas(score.missedNotes)} ${change ? change.misses : ""}`,
          inline: true,
        },
        {
          name: "Bad Cuts",
          value: `${formatNumberWithCommas(score.badCuts)} ${change ? change.badCuts : ""}`,
          inline: true,
        },
        {
          name: "Max Combo",
          value: `${formatNumberWithCommas(score.maxCombo)} ${score.fullCombo ? "/ FC" : ""} ${change ? change.maxCombo : ""}`,
          inline: true,
        },
      ])
      .setThumbnail(leaderboard.songArt)
      .setTimestamp(score.timestamp)
      .setFooter({
        text: `Powered by ${Config.websiteUrl}`,
      })
      .setColor("#00ff00")
  );

  return message;
}
