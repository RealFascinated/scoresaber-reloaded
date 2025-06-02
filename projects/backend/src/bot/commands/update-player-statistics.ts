import Logger from "@ssr/common/logger";
import type { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { PlayerService } from "../../service/player.service";
import { BotOwnerGuard } from "../guard/bot-owner-guard";

@Discord()
export class UpdatePlayerStatistics {
  @Slash({ description: "Update player statistics", name: "update-player-statistics" })
  @Guard(BotOwnerGuard)
  async updatePlayerStatistics(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();

      let finalSuccessCount = 0;
      let finalErrorCount = 0;

      await PlayerService.updatePlayerStatistics(
        async (currentPage, totalPages, successCount, errorCount) => {
          try {
            finalSuccessCount = successCount;
            finalErrorCount = errorCount;
            await interaction.editReply(
              `Updating player statistics... ${currentPage}/${totalPages} pages completed\n` +
                `Successfully processed: ${successCount} players\n` +
                `Failed to process: ${errorCount} players`
            );
          } catch (error: unknown) {
            Logger.error(
              `Failed to update interaction message: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );

      await interaction.editReply(
        `Player statistics update completed!\n` +
          `Successfully processed: ${finalSuccessCount} players\n` +
          `Failed to process: ${finalErrorCount} players`
      );
    } catch (error: unknown) {
      Logger.error(
        `Failed to update player statistics: ${error instanceof Error ? error.message : String(error)}`
      );
      try {
        if (interaction.deferred) {
          await interaction.editReply(
            `Failed to update player statistics: ${error instanceof Error ? error.message : String(error)}`
          );
        } else {
          await interaction.reply(
            `Failed to update player statistics: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } catch (replyError: unknown) {
        Logger.error(
          `Failed to send error message: ${replyError instanceof Error ? replyError.message : String(replyError)}`
        );
      }
    }
  }
}
