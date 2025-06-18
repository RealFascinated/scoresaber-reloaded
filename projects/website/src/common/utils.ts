import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if the url is valid
 *
 * @param url the url to validate
 * @returns true if the url is valid, false otherwise
 */
export function validateUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getRandomInteger(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Checks if two objects are equal
 *
 * @param first the first object
 * @param second the second object
 * @returns true if the objects are equal, false otherwise
 */
export const isEqual = (first: any, second: any): boolean => {
  if (first === second) {
    return true;
  }
  if (
    (first === undefined || second === undefined || first === null || second === null) &&
    (first || second)
  ) {
    return false;
  }
  const firstType = Object.prototype.toString.call(first);
  const secondType = Object.prototype.toString.call(second);
  if (firstType !== secondType) {
    return false;
  }
  if (firstType === "[object Array]") {
    if (first.length !== second.length) {
      return false;
    }
    return first.every((item: any, index: any) => isEqual(item, second[index]));
  }
  if (firstType === "[object Object]") {
    const fKeys = Object.keys(first);
    const sKeys = Object.keys(second);
    if (fKeys.length !== sKeys.length) {
      return false;
    }
    return fKeys.every(key => isEqual(first[key], second[key]));
  }
  return false; // For primitive types, return false if not equal
};

/**
 * Calculates the width of the first column in the player ranking table.
 *
 * @param players the players to calculate the width for
 * @returns the width of the first column
 */
export function getPlayerRankingColumnWidth(
  players: (ScoreSaberPlayer | ScoreSaberPlayerToken)[],
  minWidth = 160
) {
  const maxRank = players?.reduce((max, p) => Math.max(max, p.rank ?? 0), 0) ?? 0;
  const maxCountryRank = players?.reduce((max, p) => Math.max(max, p.countryRank ?? 0), 0) ?? 0;

  // Calculate padding based on number of digits
  const rankDigits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
  const countryRankDigits = maxCountryRank > 0 ? Math.floor(Math.log10(maxCountryRank)) + 1 : 0;

  // Base width + padding for each rank type (20 per digit)
  // Ensure minimum width of 160px for small numbers
  return Math.max(minWidth, 70 + rankDigits * 18 + countryRankDigits * 18);
}
