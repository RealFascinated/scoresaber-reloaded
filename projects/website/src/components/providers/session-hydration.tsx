import { getServerSession } from "@/common/auth/session-server";
import { prefetchInitialData } from "@/common/server-prefetch";
import { FOLLOWING_QUERY_KEY } from "@/hooks/use-following";
import { playerQuery } from "@/hooks/use-main-player";
import { ME_QUERY_KEY } from "@/hooks/use-me";
import { USER_PREFERENCES_QUERY_KEY } from "@/hooks/use-user-preferences";
import { DEFAULT_USER_PREFERENCES } from "@ssr/common/schemas/user/preferences";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { ReactNode } from "react";

/**
 * Resolves the session and the user's preferences and who they follow on the server, so the first paint already has
 * the right background, snow, kitty and signed-in state instead of flashing the defaults. The players the user
 * follows (and the user's own player) are loaded with them, as the sidebar and the home page show them.
 *
 * This has to happen here: the sidebar renders before the page and creates these queries, and a query that
 * already exists can't be seeded by a boundary further down, which would leave the server HTML without them.
 *
 * When the backend can't answer nothing is hydrated and the client fetches them itself.
 */
export default async function SessionHydration({ children }: { children: ReactNode }) {
  const session = await getServerSession((await cookies()).toString());

  const queryClient = new QueryClient();
  if (session.status === "signed-in") {
    queryClient.setQueryData(ME_QUERY_KEY, session.me);
    queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, session.preferences);
    queryClient.setQueryData(FOLLOWING_QUERY_KEY, session.following);

    const playerIds = new Set(session.following);
    if (session.me.playerId) {
      playerIds.add(session.me.playerId);
    }
    const players = await Promise.all(
      [...playerIds].map(async id => ({
        id,
        player: await prefetchInitialData(ssrApi.getScoreSaberPlayer(id, "basic")),
      }))
    );
    for (const { id, player } of players) {
      if (player) {
        queryClient.setQueryData(playerQuery(id).queryKey, player);
      }
    }
  } else if (session.status === "anonymous") {
    queryClient.setQueryData(ME_QUERY_KEY, null);
    queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, DEFAULT_USER_PREFERENCES);
    queryClient.setQueryData(FOLLOWING_QUERY_KEY, []);
  }

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
