/** The page of following scores shown first. */
export const FOLLOWING_SCORES_FIRST_PAGE = 1;

/** The query of the signed-in user's own player on the home page. */
export function homePlayerQueryKey(mainPlayerId: string | undefined, realmId: number) {
  return ["player", mainPlayerId, realmId] as const;
}

/** The query of the recent scores of the players the signed-in user follows. */
export function followingScoresQueryKey(
  followingIds: string[],
  page: number,
  mainPlayerId: string | undefined,
  realmId: number
) {
  return ["following-scores", followingIds, page, mainPlayerId, realmId] as const;
}
