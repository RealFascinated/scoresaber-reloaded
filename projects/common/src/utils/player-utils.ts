import {PlayerHistory} from "../player/player-history";
import {kyFetchJson, kyFetchText} from "./utils";
import {Config} from "../config";
import {AroundPlayer} from "../types/around-player";
import {AroundPlayerResponse} from "../response/around-player-response";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import {formatDateMinimal, getMidnightAlignedDate} from "./time-utils";
import {PpBoundaryResponse} from "../response/pp-boundary-response";
import {PlayedMapsCalendarResponse} from "../response/played-maps-calendar-response";
import {ScoreSaberScore} from "../model/score/impl/scoresaber-score";
import {Page} from "../pagination";
import SuperJSON from "superjson";

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
 * Ensure the player is being tracked.
 *
 * @param playerId the player id
 */
export async function trackPlayer(playerId: string) {
  await kyFetchJson(`${Config.apiUrl}/player/track/${playerId}`);
}

/**
 * Gets the players around a player.
 *
 * @param playerId the player to get around
 * @param type the type to get
 */
export async function getPlayersAroundPlayer(playerId: string, type: AroundPlayer) {
  return await kyFetchJson<AroundPlayerResponse>(`${Config.apiUrl}/player/around/${playerId}/${type}`);
}

/**
 * Gets the pp boundary for a player.
 *
 * @param playerId the player's id
 * @param boundary the pp boundary
 */
export async function getPlayerPpBoundary(playerId: string, boundary: number = 1) {
  return await kyFetchJson<PpBoundaryResponse>(`${Config.apiUrl}/player/pp-boundary/${playerId}/${boundary}`);
}

/**
 * Gets the score calendar for a player.
 *
 * @param playerId the player's id
 * @param year the year to get the score calendar for
 * @param month the month to get the score calendar for
 */
export async function getScoreCalendar(playerId: string, year: number, month: number) {
  return await kyFetchJson<PlayedMapsCalendarResponse>(
    `${Config.apiUrl}/player/history/calendar/${playerId}/${year}/${month}`
  );
}

/**
 * Get the friend scores for a leaderboard
 *
 * @param friendIds the friends to lookup
 * @param leaderboardId the leaderboard to lookup
 * @param page the page
 */
export async function getFriendScores(friendIds: string[], leaderboardId: string, page: number) {
  return await kyFetchJson<Page<ScoreSaberScore>>(`${Config.apiUrl}/scores/friends/${leaderboardId}/${page}`, {
    searchParams: {
      friendIds: friendIds.join(","),
    },
  });
}

/**
 * Looks up a ScoreSaber player
 *
 * @param playerId the player to lookup
 * @param createIfMissing create the player if they are not being tracked
 * @returns the player
 */
export async function getScoreSaberPlayer(playerId: string, createIfMissing?: boolean) {
  const response = await kyFetchText(
    `${Config.apiUrl}/player/${playerId}?superJson=true${createIfMissing ? `&createIfMissing=${createIfMissing}` : ""}`
  );
  if (response === undefined) {
    return undefined;
  }
  return SuperJSON.parse<ScoreSaberPlayer>(response);
}
