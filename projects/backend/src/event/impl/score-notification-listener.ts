import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatLeaderScoreToken } from "@ssr/common/types/token/beatleader/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { DiscordChannels } from "../../bot/bot";
import { sendScoreNotification } from "../../common/score/score.util";
import { EventListener } from "../event-listener";

export class ScoreNotificationListener implements EventListener {
  async onScoreReceived(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard,
    player: ScoreSaberPlayerToken,
    beatLeaderScore: BeatLeaderScoreToken | undefined,
    isTop50GlobalScore: boolean
  ) {
    const playerInfo = score.playerInfo;

    // Prepare notifications to send
    const notifications = [];

    // Always send score flood gate notifications
    notifications.push(
      sendScoreNotification(
        DiscordChannels.scoreFloodGateFeed,
        score,
        leaderboard,
        player,
        beatLeaderScore,
        `${playerInfo.name} just set a rank #${score.rank}!`
      )
    );

    // Only send ranked notifications if the map is ranked
    if (leaderboard.stars > 0) {
      // Send #1 notification if applicable
      if (score.rank === 1) {
        notifications.push(
          sendScoreNotification(
            DiscordChannels.numberOneFeed,
            score,
            leaderboard,
            player,
            beatLeaderScore,
            `${playerInfo.name} just set a #1!`
          )
        );
      }

      // Send top 50 notification if applicable
      if (isTop50GlobalScore) {
        notifications.push(
          sendScoreNotification(
            DiscordChannels.top50Feed,
            score,
            leaderboard,
            player,
            beatLeaderScore,
            `${playerInfo.name} just set a new top 50 score!`
          )
        );
      }
    }

    // Send all notifications in parallel
    await Promise.all(notifications);
  }
}
