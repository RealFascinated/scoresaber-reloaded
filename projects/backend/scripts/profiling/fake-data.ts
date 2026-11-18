import { createHash } from "node:crypto";

export const PLAYERS = Number(process.env.FAKE_PLAYERS ?? 100_000);
export const LEADERBOARDS = Number(process.env.FAKE_LEADERBOARDS ?? 20_000);
export const PLAYER_ID_BASE = 76561198000000000n;
export const DIFFICULTIES = ["Normal", "Hard", "Expert", "ExpertPlus"] as const;
export const DIFFICULTY_RAW = [3, 5, 7, 9] as const;
export const COUNTRIES = [
  "US",
  "GB",
  "DE",
  "FR",
  "JP",
  "KR",
  "AU",
  "CA",
  "SE",
  "PL",
  "NL",
  "BR",
  "RU",
  "CN",
  "FI",
  "NO",
];
export const SCORE_ID_STRIDE = 10_000;

export function playerId(index: number) {
  return (PLAYER_ID_BASE + BigInt(index)).toString();
}

export function playerIndex(id: string) {
  return Number(BigInt(id) - PLAYER_ID_BASE);
}

export function playerCountry(index: number) {
  return COUNTRIES[index % COUNTRIES.length];
}

export function playerPp(index: number) {
  return Math.round(20000 * Math.exp(-index / (PLAYERS / 8)) * 100) / 100;
}

export function songIndex(leaderboardId: number) {
  return Math.ceil(leaderboardId / DIFFICULTIES.length);
}

export function songHash(leaderboardId: number) {
  return createHash("sha256")
    .update(`song-${songIndex(leaderboardId)}`)
    .digest("hex")
    .slice(0, 40)
    .toUpperCase();
}

export function leaderboardDifficultyIndex(leaderboardId: number) {
  return (leaderboardId - 1) % DIFFICULTIES.length;
}

export function leaderboardRanked(leaderboardId: number) {
  return leaderboardId % 3 !== 0;
}

export function leaderboardStars(leaderboardId: number) {
  return leaderboardRanked(leaderboardId) ? 1 + ((leaderboardId * 37) % 1300) / 100 : 0;
}

export function leaderboardMaxScore(leaderboardId: number) {
  return 500_000 + ((leaderboardId * 7919) % 1_500_000);
}

export function leaderboardPlays(leaderboardId: number) {
  return Math.floor(1000 * Math.exp(-leaderboardId / (LEADERBOARDS / 5))) + 20;
}

export function scorePlayerIndex(leaderboardId: number, rank: number) {
  return ((leaderboardId * 7919 + rank * 104729) % PLAYERS) + 1;
}

export function scoreId(leaderboardId: number, rank: number) {
  return leaderboardId * SCORE_ID_STRIDE + rank;
}

export function scoreValue(leaderboardId: number, rank: number) {
  return Math.floor(leaderboardMaxScore(leaderboardId) * (0.99 - rank * 0.00015));
}

export function scorePp(leaderboardId: number, rank: number) {
  return leaderboardRanked(leaderboardId)
    ? Math.max(0, leaderboardStars(leaderboardId) * 42 * (1 - rank * 0.0003))
    : 0;
}
