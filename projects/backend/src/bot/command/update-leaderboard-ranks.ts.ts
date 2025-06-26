import { IsGuildUser } from "@discordx/utilities";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { LeaderboardService } from "../../service/leaderboard/leaderboard.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
export class ForceUpdateLeaderboardRanks {
  @Slash({ description: "Force update a leaderboard's ranks", name: "update-leaderboard-ranks" })
  async forceUpdateLeaderboardRanks(
    @SlashOption({
      description: "The leaderboard's id to update the ranks for",
      name: "leaderboard",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    leaderboardId: number,
    interaction: CommandInteraction
  ) {
    interaction.deferReply();

    try {
      const leaderboard = await ScoreSaberLeaderboardModel.findById(leaderboardId);
      if (!leaderboard) {
        throw new Error("Leaderboard not found");
      }
      if (!leaderboard.ranked) {
        throw new Error("Leaderboard is not ranked");
      }

      const before = performance.now();
      await LeaderboardService.refreshLeaderboardScoresRank(leaderboard);

      interaction.editReply({
        content: `Updated ranks for leaderboard ${leaderboardId} in ${formatDuration(performance.now() - before)}`,
      });
    } catch (error) {
      interaction.editReply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
