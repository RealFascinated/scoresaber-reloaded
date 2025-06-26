import { IsGuildUser } from "@discordx/utilities";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { LeaderboardService } from "../../service/leaderboard/leaderboard.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class ForceUpdateLeaderboardRanks {
  @Slash({ description: "Force update all leaderboard ranks", name: "update-leaderboard-ranks" })
  async forceUpdateLeaderboardRanks(interaction: CommandInteraction) {
    await interaction.deferReply();

    try {
      const leaderboards = await ScoreSaberLeaderboardModel.find({
        ranked: true,
      })
        .sort({ plays: 1 })
        .lean();

      for (const leaderboard of leaderboards) {
        await LeaderboardService.refreshLeaderboardScoresRank(
          LeaderboardService.leaderboardToObject(leaderboard)
        );
      }
      interaction.editReply({
        content: `Updated ranks for all leaderboards`,
      });
    } catch (error) {
      interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
