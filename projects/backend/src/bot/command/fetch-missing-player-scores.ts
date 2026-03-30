import { IsGuildUser } from "@discordx/utilities";
import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { Discord, Guard, Slash, SlashOption } from "discordx";
import { db } from "../../db";
import { scoreSaberAccountToPlayer } from "../../db/converter/scoresaber-account";
import { scoreSaberAccountsTable } from "../../db/schema";
import { FetchMissingScoresQueue } from "../../queue/impl/fetch-missing-scores-queue";
import { QueueId, QueueManager } from "../../queue/queue-manager";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { ScoreSaberApiService } from "../../service/scoresaber-api.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class FetchMissingPlayerScores {
  @Slash({
    description: "Force fetch missing scores for a player or all players",
    name: "fetch-missing-player-scores",
  })
  async fetchMissingPlayerScores(
    @SlashOption({
      description: "The player's id to refresh the scores for",
      name: "player",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    playerId: string,
    interaction: CommandInteraction
  ) {
    try {
      if (!playerId) {
        interaction.reply({
          content: "Adding all players to the fetch missing scores queue...",
        });
        const players = await db.select({ id: scoreSaberAccountsTable.id }).from(scoreSaberAccountsTable);
        const playerIds = players.map(p => p.id);
        if (playerIds.length === 0) {
          interaction.editReply({
            content: "No players to fetch missing scores for",
          });
          return;
        }
        for (const playerId of playerIds) {
          (QueueManager.getQueue(QueueId.PlayerScoreRefreshQueue) as FetchMissingScoresQueue).add({
            id: playerId,
            data: playerId,
          });
        }
        interaction.editReply({
          content: `Added ${playerIds.length} players to the fetch missing scores queue`,
        });
        return;
      }

      const playerToken = await ScoreSaberApiService.lookupPlayer(playerId);
      if (!playerToken) {
        throw new Error("Player not found");
      }

      const account = await PlayerCoreService.getPlayer(playerId, playerToken);
      PlayerScoresService.fetchMissingPlayerScores(scoreSaberAccountToPlayer(account), playerToken);

      interaction.reply({
        content: `Fetching missing scores for ${playerToken.name}...`,
      });
    } catch (error) {
      interaction.reply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
