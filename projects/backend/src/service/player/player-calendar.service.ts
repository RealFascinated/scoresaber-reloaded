import { PlayerHistoryEntryModel } from "@ssr/common/model/player/player-history-entry";
import { ScoreCalendarData } from "@ssr/common/types/player/player-statistic";
import { PlayerService } from "./player.service";

export class PlayerCalendarService {
  /**
   * Generates score calendar data for a specific year and month.
   */
  public static async generateScoreCalendar(
    playerId: string,
    year: number,
    month: number
  ): Promise<ScoreCalendarData> {
    await PlayerService.playerExists(playerId, true); // throws if player doesn't exist

    const entries = await PlayerHistoryEntryModel.find({
      playerId: playerId,
    }).lean();

    const days: Record<number, { rankedMaps: number; unrankedMaps: number; totalMaps: number }> =
      {};
    const metadata: Record<number, number[]> = {};

    for (const entry of entries) {
      const date = entry.date;
      const statYear = date.getFullYear();
      const statMonth = date.getMonth() + 1;

      if (
        !entry.rankedScores ||
        !entry.unrankedScores ||
        typeof entry.rankedScores !== "number" ||
        typeof entry.unrankedScores !== "number"
      ) {
        continue;
      }

      if (!metadata[statYear]) {
        metadata[statYear] = [];
      }
      if (!metadata[statYear].includes(statMonth)) {
        metadata[statYear].push(statMonth);
      }

      if (statYear === year && statMonth === month) {
        const rankedScores = entry.rankedScores ?? 0;
        const unrankedScores = entry.unrankedScores ?? 0;

        days[date.getDate()] = {
          rankedMaps: rankedScores,
          unrankedMaps: unrankedScores,
          totalMaps: rankedScores + unrankedScores,
        };
      }
    }

    // Sort months in metadata
    for (const [year, months] of Object.entries(metadata)) {
      metadata[Number(year)] = months.sort();
    }

    return { days, metadata };
  }
}
