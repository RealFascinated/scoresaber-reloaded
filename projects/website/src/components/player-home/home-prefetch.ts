import type { ServerSession } from "@/common/auth/session-server";
import { prefetchInitialData } from "@/common/server-prefetch";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { dehydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { FOLLOWING_SCORES_FIRST_PAGE, followingScoresQueryKey, homePlayerQueryKey } from "./home-queries";

/**
 * Fetches what the home page shows for the signed-in user (their player and the recent scores of the players
 * they follow) so it is part of the server-rendered HTML. Without it the page renders spinners that the
 * content then replaces, shifting the layout. The followed players themselves are loaded by `SessionHydration`.
 *
 * Only the default realm is seeded, as the keys include the realm: a visitor on another realm misses the
 * seeded data and the client fetches it as before. A request that fails or is too slow is left out.
 *
 * @param session the session of the request
 * @returns the data to hydrate on the client, undefined when there is nothing to show
 */
export async function prefetchHomeData(session: ServerSession): Promise<DehydratedState | undefined> {
  if (session.status !== "signed-in" || !session.me.playerId) {
    return undefined;
  }

  const mainPlayerId = session.me.playerId;
  const followingIds = [...session.following, mainPlayerId];

  const [player, scores] = await Promise.all([
    prefetchInitialData(ssrApi.getScoreSaberPlayer(mainPlayerId, "full", DEFAULT_REALM_ID)),
    prefetchInitialData(
      ssrApi.fetchPlayerScoreSaberScores(mainPlayerId, FOLLOWING_SCORES_FIRST_PAGE, "date", "desc", {
        playerIds: followingIds,
        realmId: DEFAULT_REALM_ID,
      })
    ),
  ]);

  const queryClient = new QueryClient();
  if (player) {
    queryClient.setQueryData(homePlayerQueryKey(mainPlayerId, DEFAULT_REALM_ID), player);
  }
  if (scores) {
    queryClient.setQueryData(
      followingScoresQueryKey(followingIds, FOLLOWING_SCORES_FIRST_PAGE, mainPlayerId, DEFAULT_REALM_ID),
      scores
    );
  }

  return dehydrate(queryClient);
}
