import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatChange } from "@ssr/common/utils/utils";
import { EmbedBuilder } from "discord.js";
import { DiscordChannels, logToChannel } from "../../bot/bot";
import BeatSaverService from "../../service/beatsaver.service";
import { PreviousScoresService } from "../../service/score/previous-scores.service";

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
  player: ScoreSaberPlayerToken,
  beatLeaderScore: BeatLeaderScoreToken | undefined,
  title: string
) {
  const beatSaver = await BeatSaverService.getMap(
    leaderboard.songHash,
    leaderboard.difficulty.difficulty,
    leaderboard.difficulty.characteristic,
    DetailType.BASIC
  );

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
      misses: previousScore.misses == score.misses ? "" : ` vs ${previousScore.misses}`,
      badCuts: previousScore.badCuts == score.badCuts ? "" : ` vs ${previousScore.badCuts}`,
      maxCombo: previousScore.maxCombo == score.maxCombo ? "" : ` vs ${previousScore.maxCombo}`,
    };

  const message = await logToChannel(
    channel,
    new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        [
          `🎵 **${leaderboard.fullName}**`,
          `📊 ${getDifficultyName(leaderboard.difficulty.difficulty)}${leaderboard.stars > 0 ? ` • ${leaderboard.stars.toFixed(2)}★` : ""}`,
          "",
          [
            `👤 [[Player]](${env.NEXT_PUBLIC_WEBSITE_URL}/player/${player.id})`,
            `🏆 [[Leaderboard]](${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboard.id})`,
            beatSaver ? `🗺️ [[Map]](https://beatsaver.com/maps/${beatSaver.bsr})` : undefined,
            beatLeaderScore
              ? `🎥 [[Replay]](https://replay.beatleader.xyz/?scoreId=${beatLeaderScore.id})`
              : undefined,
          ].join(" • "),
        ]
          .join("\n")
          .trim()
      )
      .addFields([
        {
          name: "🎯 Performance",
          value: [
            `**Accuracy:** ${formatScoreAccuracy(score)} ${change ? change.accuracy : ""}`,
            `**PP:** ${score.pp > 0 ? `${formatPp(score.pp)}pp ${change ? change.pp : ""}` : "N/A"}`,
            `**Modifiers:** ${score.modifiers.length > 0 ? score.modifiers.join(", ") : "None"}`,
          ].join("\n"),
          inline: false,
        },
        {
          name: "📊 Statistics",
          value: [
            `**Misses:** ${formatNumberWithCommas(score.missedNotes)} ${change ? change.misses : ""}`,
            `**Bad Cuts:** ${formatNumberWithCommas(score.badCuts)} ${change ? change.badCuts : ""}`,
            `**Max Combo:** ${formatNumberWithCommas(score.maxCombo)} ${score.fullCombo ? "• FC" : ""} ${change ? change.maxCombo : ""}`,
          ].join("\n"),
          inline: false,
        },
      ])
      .setThumbnail(leaderboard.songArt)
      .setTimestamp(score.timestamp)
      .setFooter({
        text: `Powered by ${env.NEXT_PUBLIC_WEBSITE_URL}`,
      })
      .setColor(score.pp > 0 ? "#d4af37" : "#808080")
  );

  return message;
}
