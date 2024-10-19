import { PlayerHistory } from "../player/player-history";
import { kyFetch } from "./utils";
import { Config } from "../config";
import { AroundPlayer } from "../types/around-player";
import { AroundPlayerResponse } from "../response/around-player-response";

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
