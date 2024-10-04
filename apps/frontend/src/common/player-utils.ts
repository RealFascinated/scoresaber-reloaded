import { PlayerHistory } from "@/common/player/player-history";
import { IPlayer } from "@/common/schema/player-schema";
import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { getDaysAgoDate, getMidnightAlignedDate } from "@/common/time-utils";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { IO } from "@trigger.dev/sdk";

/**
 * Sorts the player history based on date,
 * so the most recent date is first
 *
 * @param history the player history
 */
export function sortPlayerHistory(history: Map<string, PlayerHistory>) {
  return Array.from(history.entries()).sort(
    (a, b) => Date.parse(b[0]) - Date.parse(a[0]) // Sort in descending order
  );
}

/**
 * Gets a value from an {@link PlayerHistory}
 * based on the field
 *
 * @param history the history to get the value from
 * @param field the field to get
 */
export function getValueFromHistory(history: PlayerHistory, field: string): number | null {
  const keys = field.split(".");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let value: any = history;

  // Navigate through the keys safely
  for (const key of keys) {
    if (value && key in value) {
      value = value[key];
    } else {
      return null; // Return null if the key doesn't exist
    }
  }

  // Ensure we return a number or null
  return typeof value === "number" ? value : null;
}

/**
 * Sorts the player history based on date,
 * so the most recent date is first
 *
 * @param foundPlayer the player
 * @param player the scoresaber player
 * @param rawPlayer the raw scoresaber player
 */
export async function seedPlayerHistory(
  foundPlayer: IPlayer,
  player: ScoreSaberPlayer,
  rawPlayer: ScoreSaberPlayerToken
): Promise<Map<string, PlayerHistory>> {
  // Loop through rankHistory in reverse, from current day backwards
  const playerRankHistory = rawPlayer.histories.split(",").map(value => {
    return parseInt(value);
  });
  playerRankHistory.push(player.rank);

  let daysAgo = 0; // Start from current day
  for (let i = playerRankHistory.length - 1; i >= 0; i--) {
    const rank = playerRankHistory[i];
    const date = getMidnightAlignedDate(getDaysAgoDate(daysAgo));
    foundPlayer.setStatisticHistory(date, {
      rank: rank,
    });
    daysAgo += 1; // Increment daysAgo for each earlier rank
  }

  foundPlayer.sortStatisticHistory();
  await foundPlayer.save();
  return foundPlayer.getStatisticHistory();
}

/**
 * Tracks a players statistics
 *
 * This is ONLY to be used in Trigger.
 *
 * @param io the io from Trigger
 * @param dateToday the date to use
 * @param foundPlayer the player to track
 */
export async function trackScoreSaberPlayer(dateToday: Date, foundPlayer: IPlayer, io?: IO) {
  io && (await io.logger.info(`Updating statistics for ${foundPlayer.id}...`));

  // Lookup player data from the ScoreSaber service
  const response = await scoresaberService.lookupPlayer(foundPlayer.id);
  if (response == undefined) {
    io && (await io.logger.warn(`Player ${foundPlayer.id} not found on ScoreSaber`));
    return;
  }
  const { player, rawPlayer } = response;

  if (rawPlayer.inactive) {
    io && (await io.logger.warn(`Player ${foundPlayer.id} is inactive on ScoreSaber`));
    return;
  }

  const statisticHistory = foundPlayer.getStatisticHistory();

  // Seed the history with ScoreSaber data if no history exists
  if (statisticHistory.size === 0) {
    io && (await io.logger.info(`Seeding history for ${foundPlayer.id}...`));
    await seedPlayerHistory(foundPlayer, player, rawPlayer);
    io && (await io.logger.info(`Seeded history for ${foundPlayer.id}`));
  }

  // Update current day's statistics
  let history = foundPlayer.getHistoryByDate(dateToday);
  if (history == undefined) {
    history = {}; // Initialize if history is not found
  }

  // Set the history data
  history.pp = player.pp;
  history.countryRank = player.countryRank;
  history.rank = player.rank;
  history.accuracy = {
    averageRankedAccuracy: rawPlayer.scoreStats.averageRankedAccuracy,
  };
  foundPlayer.setStatisticHistory(dateToday, history);
  foundPlayer.sortStatisticHistory();
  foundPlayer.lastTracked = new Date();
  await foundPlayer.save();

  io && (await io.logger.info(`Updated statistics for ${foundPlayer.id}`));
}
