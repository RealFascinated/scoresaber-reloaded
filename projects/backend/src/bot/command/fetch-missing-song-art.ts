import { IsGuildUser } from "@discordx/utilities";
import { CommandInteraction } from "discord.js";
import { Discord, Guard, Slash } from "discordx";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { leaderboardRowToType } from "../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../db/schema";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";
import { OwnerOnly } from "../lib/guards";

@Discord()
@Guard(IsGuildUser(OwnerOnly))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class FetchMissingSongArt {
  @Slash({
    description: "Force fetch missing song art for a leaderboard or all leaderboards",
    name: "fetch-missing-song-art",
  })
  async fetchMissingSongArt(interaction: CommandInteraction) {
    try {
      await interaction.deferReply();
      const leaderboards = await db.select().from(scoreSaberLeaderboardsTable).where(eq(scoreSaberLeaderboardsTable.cachedSongArt, false));
      for (const leaderboard of leaderboards) {
        await ScoreSaberLeaderboardsService.cacheLeaderboardSongArt(leaderboardRowToType(leaderboard));
      }
      await interaction.editReply({
        content: `Cached song art for ${leaderboards.length} leaderboards`,
      });
    } catch (error) {
      interaction.reply({
        content: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
