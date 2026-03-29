import { env } from "@ssr/common/env";
import { ReplayViewers } from "@ssr/common/replay-viewer";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { MedalChange } from "@ssr/common/schemas/medals/medal-changes";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getModifierLabel } from "@ssr/common/score/modifier";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { format, pluralize } from "@ssr/common/utils/string.util";
import { formatChange } from "@ssr/common/utils/utils";
import { ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import BeatSaverService from "../../service/beatsaver.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerScoreHistoryService } from "../../service/player/player-score-history.service";

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
  beatLeaderScore: BeatLeaderScore | undefined,
  title: string
) {
  const [beatSaver, previousScore] = await Promise.all([
    BeatSaverService.getMap(
      leaderboard.songHash,
      leaderboard.difficulty.difficulty,
      leaderboard.difficulty.characteristic,
      "basic"
    ),
    PlayerScoreHistoryService.getPlayerPreviousScore(score, leaderboard),
  ]);
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
          `**${leaderboard.fullName}**`,
          `${getDifficultyName(leaderboard.difficulty.difficulty)} / ${leaderboard.difficulty.characteristic}${leaderboard.stars > 0 ? ` • ${leaderboard.stars.toFixed(2)}★` : ""}`,
        ]
          .join("\n")
          .trim()
      )
      .addFields([
        {
          name: "**__Performance__**",
          value: [
            `**Accuracy:** ${accuracy}`,
            ...(score.pp && score.pp > 0
              ? [`**PP:** ${formatPp(score.pp)}pp ${change ? change.pp : ""}`]
              : []),
            `**Modifiers:** ${
              score.modifiers.length > 0 ? score.modifiers.map(getModifierLabel).join(", ") : "None"
            }`,
          ].join("\n"),
          inline: false,
        },
        {
          name: "**__Statistics__**",
          value: [
            `**Misses:** ${formatNumberWithCommas(score.missedNotes)} ${change ? change.misses : ""}`,
            `**Bad Cuts:** ${formatNumberWithCommas(score.badCuts)} ${change ? change.badCuts : ""}`,
            `**Max Combo:** ${formatNumberWithCommas(score.maxCombo)} ${score.fullCombo ? " (FC)" : ""} ${change ? change.maxCombo : ""}`,
            ...(beatLeaderScore
              ? [
                  `**Bomb Cuts**: ${beatLeaderScore.misses.bombCuts}`,
                  `**Wall Hits**: ${beatLeaderScore.misses.wallsHit}`,
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
      .setColor(score.pp && score.pp > 0 ? "#d4af37" : "#808080"),
    getScoreButtons(score, leaderboard, beatSaver, beatLeaderScore)
  );

  return message;
}

/**
 * Sends a medal score notification to the medal scores feed.
 *
 * @param score the score to send
 * @param leaderboard the leaderboard the score was set on
 * @param changes the changes to the medal scores
 */
export async function sendMedalScoreNotification(
  score: ScoreSaberScore,
  leaderboard: ScoreSaberLeaderboard,
  beatLeaderScore: BeatLeaderScore | undefined,
  changes: Map<string, MedalChange>
) {
  const beatSaver = await BeatSaverService.getMap(
    leaderboard.songHash,
    leaderboard.difficulty.difficulty,
    leaderboard.difficulty.characteristic,
    "basic"
  );
  const description = [
    `**${leaderboard.fullName}**`,
    `${getDifficultyName(leaderboard.difficulty.difficulty)} / ${leaderboard.difficulty.characteristic}${leaderboard.stars > 0 ? ` • ${leaderboard.stars.toFixed(2)}★` : ""}`,
    "",
    "**__Changes__**",
  ];
  // Sort the changes by the number of medals gained -> most lost -> least lost
  const sortedChanges = Array.from(changes.entries()).sort((a, b) => {
    const changeA = a[1].after - a[1].before;
    const changeB = b[1].after - b[1].before;
    // Positive changes come first
    if (changeA > 0 && changeB < 0) return -1;
    if (changeA < 0 && changeB > 0) return 1;
    // Both positive: sort descending (most gained first)
    if (changeA > 0 && changeB > 0) return changeB - changeA;
    // Both negative: sort ascending (most lost first, since -10 < -5)
    return changeA - changeB;
  });

  // Find the player with the highest positive change for the title
  const topChangePlayerId = Array.from(changes.entries()).find(
    ([, change]) => change.after - change.before > 0
  )?.[0];
  if (!topChangePlayerId) {
    return;
  }

  const uniquePlayerIds = new Set([...sortedChanges.map(([playerId]) => playerId), topChangePlayerId]);
  const playerById = new Map(
    await Promise.all(
      [...uniquePlayerIds].map(async playerId => {
        const player = await PlayerCoreService.getPlayer(playerId);
        return [playerId, player] as const;
      })
    )
  );

  for (const [playerId, change] of sortedChanges) {
    const changePlayer = playerById.get(playerId);
    if (!changePlayer) {
      continue;
    }
    description.push(
      format(
        `**[%s](%s)** %s %s %s (%s -> %s)`,
        changePlayer.name,
        env.NEXT_PUBLIC_WEBSITE_URL + "/player/" + playerId,
        change.after - change.before < 0 ? "lost" : "gained",
        Math.abs(change.after - change.before),
        pluralize(Math.abs(change.after - change.before), "medal"),
        formatNumberWithCommas(change.before),
        formatNumberWithCommas(change.after)
      )
    );
  }

  const topChangePlayer = playerById.get(topChangePlayerId);
  if (!topChangePlayer) {
    return;
  }

  await sendEmbedToChannel(
    DiscordChannels.MEDAL_SCORES_FEED,
    new EmbedBuilder()
      .setTitle(`${topChangePlayer.name} set a #${score.rank}!`)
      .setDescription(description.join("\n").trim())
      .setThumbnail(leaderboard.songArt)
      .setColor(Colors.Green)
      .setTimestamp(score.timestamp)
      .setFooter({
        text: `Powered by ${env.NEXT_PUBLIC_WEBSITE_URL}`,
      }),
    getScoreButtons(score, leaderboard, beatSaver, beatLeaderScore)
  );
}

/**
 * Gets the buttons for a score.
 *
 * @param score the score to get the buttons for
 * @param leaderboard the leaderboard the score was set on
 * @param beatSaver the beatSaver map
 * @param beatLeaderScore the beatLeader score
 * @returns the buttons for the score
 */
function getScoreButtons(
  score: ScoreSaberScore,
  leaderboard: ScoreSaberLeaderboard,
  beatSaver: BeatSaverMapResponse | undefined,
  beatLeaderScore: BeatLeaderScore | undefined
) {
  return [
    {
      type: 1,
      components: [
        new ButtonBuilder()
          .setLabel("Player")
          .setEmoji("👤")
          .setStyle(ButtonStyle.Link)
          .setURL(`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${score.playerId}`),
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
  ];
}
