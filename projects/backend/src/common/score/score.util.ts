import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberMedalsScore } from "@ssr/common/model/score/impl/scoresaber-medals-score";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { removeObjectFields } from "@ssr/common/object.util";
import { ReplayViewers } from "@ssr/common/replay-viewer";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatChange } from "@ssr/common/utils/utils";
import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import BeatSaverService from "../../service/beatsaver.service";
import { PlayerService } from "../../service/player/player.service";

/**
 * Converts a database score to a ScoreSaberScore.
 *
 * @param score the score to convert
 * @returns the converted score
 */
export function scoreToObject(
  score: ScoreSaberScore | ScoreSaberMedalsScore
): ScoreSaberScore | ScoreSaberMedalsScore {
  return {
    ...removeObjectFields<ScoreSaberScore | ScoreSaberMedalsScore>(score, ["_id", "id", "__v"]),
    id: score._id,
  } as unknown as ScoreSaberScore | ScoreSaberMedalsScore;
}

/**
 * Sends a score notification to the number one feed.
 *
 * @param score the score to send
 * @param leaderboard the leaderboard the score was set on
 * @param title the title of the notification
 */
export async function sendScoreNotification(
  channel: (typeof DiscordChannels)[keyof typeof DiscordChannels],
  score: ScoreSaberScore,
  leaderboard: ScoreSaberLeaderboard,
  player: ScoreSaberPlayerToken,
  beatLeaderScore: AdditionalScoreData | undefined,
  title: string
) {
  const beatSaver = await BeatSaverService.getMap(
    leaderboard.songHash,
    leaderboard.difficulty.difficulty,
    leaderboard.difficulty.characteristic,
    DetailType.BASIC
  );

  const previousScore = await PlayerService.getPlayerPreviousScore(
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

  const accuracy =
    leaderboard.maxScore > 0
      ? `${formatScoreAccuracy(score.accuracy)} ${change ? change.accuracy : ""}${beatLeaderScore && !score.fullCombo ? ` (FC: ${formatScoreAccuracy(beatLeaderScore.fcAccuracy)})` : ""}`
      : "N/A%";

  const message = await sendEmbedToChannel(
    channel,
    new EmbedBuilder()
      .setTitle(title)
      .setDescription(
        [
          `🎵 **${leaderboard.fullName}**`,
          `⚡ ${getDifficultyName(leaderboard.difficulty.difficulty)} / ${leaderboard.difficulty.characteristic}${leaderboard.stars > 0 ? ` • ${leaderboard.stars.toFixed(2)}★` : ""}`,
        ]
          .join("\n")
          .trim()
      )
      .addFields([
        {
          name: "🎯 Performance",
          value: [
            `**Accuracy:** ${accuracy}`,
            ...(score.pp > 0 ? [`**PP:** ${formatPp(score.pp)}pp ${change ? change.pp : ""}`] : []),
            `**Modifiers:** ${score.modifiers.length > 0 ? score.modifiers.join(", ") : "None"}`,
          ].join("\n"),
          inline: false,
        },
        {
          name: "📊 Statistics",
          value: [
            `**Misses:** ${formatNumberWithCommas(score.missedNotes)} ${change ? change.misses : ""}`,
            `**Bad Cuts:** ${formatNumberWithCommas(score.badCuts)} ${change ? change.badCuts : ""}`,
            `**Max Combo:** ${formatNumberWithCommas(score.maxCombo)} ${score.fullCombo ? " (FC)" : ""} ${change ? change.maxCombo : ""}`,
            ...(beatLeaderScore
              ? [
                  `**Bomb Cuts** ${beatLeaderScore.misses.bombCuts}`,
                  `**Wall Hits** ${beatLeaderScore.misses.wallsHit}`,
                ]
              : []),
          ].join("\n"),
          inline: false,
        },
      ])
      .setThumbnail(leaderboard.songArt)
      .setTimestamp(score.timestamp)
      .setFooter({
        text: `Powered by ${env.NEXT_PUBLIC_WEBSITE_URL}`,
      })
      .setColor(score.pp > 0 ? "#d4af37" : "#808080"),
    [
      {
        type: 1,
        components: [
          new ButtonBuilder()
            .setLabel("Player")
            .setEmoji("👤")
            .setStyle(ButtonStyle.Link)
            .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${player.id}`),
          new ButtonBuilder()
            .setLabel("Leaderboard")
            .setEmoji("🏆")
            .setStyle(ButtonStyle.Link)
            .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboard.id}`),
          ...(beatSaver
            ? [
                new ButtonBuilder()
                  .setLabel("Map")
                  .setEmoji("🗺️")
                  .setStyle(ButtonStyle.Link)
                  .setURL(`https://beatsaver.com/maps/${beatSaver.bsr}`),
              ]
            : []),
          ...(beatLeaderScore
            ? [
                new ButtonBuilder()
                  .setLabel("Replay")
                  .setEmoji("🎥")
                  .setStyle(ButtonStyle.Link)
                  .setURL(
                    ReplayViewers.beatleader.generateUrl(
                      beatLeaderScore.scoreId,
                      getBeatLeaderReplayRedirectUrl(beatLeaderScore)
                    )
                  ),
              ]
            : []),
        ],
      },
    ]
  );

  return message;
}
