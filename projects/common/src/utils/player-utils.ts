import { PlayerHistory } from "../player/player-history";
import { kyFetch } from "./utils";
import { Config } from "../config";
import { AroundPlayer } from "../types/around-player";
import { AroundPlayerResponse } from "../response/around-player-response";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { formatDateMinimal, getMidnightAlignedDate } from "./time-utils";

/**
 * Gets the player's history for today.
 *
 * @param player the player to get the history for
 * @returns the player's history
 */
export function getPlayerHistoryToday(player: ScoreSaberPlayer) {
  const today = getMidnightAlignedDate(new Date());
  return player.statisticHistory[formatDateMinimal(today)] || {};
}

/**
 * Gets a value from an {@link PlayerHistory}
 * based on the field
 *
 * @param history the history to get the value from
 * @param field the field to get
 */
export function getValueFromHistory(history: PlayerHistory, field: string): number | undefined {
  const keys = field.split(".");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let value: any = history;

  // Navigate through the keys safely
  for (const key of keys) {
    if (value && key in value) {
      value = value[key];
    } else {
      return undefined; // Return null if the key doesn't exist
    }
  }

  // Ensure we return a number or null
  return typeof value === "number" ? value : undefined;
}

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
 * Ensure the player is being tracked.
 *
 * @param id the player id
 */
export async function trackPlayer(id: string) {
  await kyFetch(`${Config.apiUrl}/player/history/${id}?createIfMissing=true`);
}

/**
 * Gets the players around a player.
 *
 * @param id the player to get around
 * @param type the type to get
 */
export async function getPlayersAroundPlayer(id: string, type: AroundPlayer) {
  return await kyFetch<AroundPlayerResponse>(`${Config.apiUrl}/player/around/${id}/${type}`);
}
