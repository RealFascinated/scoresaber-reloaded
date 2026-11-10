/** The query of the players ranked around a player, globally and in their country. */
export function miniRankingQueryKey(playerId: string) {
  return ["mini-ranking", playerId] as const;
}
