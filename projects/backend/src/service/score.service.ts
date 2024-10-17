import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { MessageBuilder, Webhook } from "discord-webhook-node";
import { Config } from "../common/config";
import { formatPp } from "@ssr/common/utils/number-utils";
import { isProduction } from "@ssr/common/utils/utils";

export class ScoreService {
  /**
   * Notifies the number one score in Discord.
   *
   * @param playerScore the score to notify
   */
  public static async notifyNumberOne(playerScore: ScoreSaberPlayerScoreToken) {
    // Only notify in production
    if (!isProduction()) {
      return;
    }

    const { score, leaderboard } = playerScore;
    const player = score.leaderboardPlayerInfo;

    // Not ranked
    if (leaderboard.stars <= 0) {
      return;
    }
    // Not #1 rank
    if (score.rank !== 1) {
      return;
    }

    const hook = new Webhook({
      url: Config.numberOneWebhook,
    });
    hook.setUsername("Number One Feed");
    const embed = new MessageBuilder();
    embed.setTitle(`${player.name} set a #${score.rank} on ${leaderboard.songName} ${leaderboard.songSubName}`);
    embed.setDescription(`
    **Player:** https://ssr.fascinated.cc/player/${player.id}
    **Leaderboard:** https://ssr.fascinated.cc/leaderboard/${leaderboard.id}
    **PP:** ${formatPp(score.pp)}
    `);
    embed.setThumbnail(leaderboard.coverImage);
    embed.setColor("#00ff00");
    await hook.send(embed);
  }
}
