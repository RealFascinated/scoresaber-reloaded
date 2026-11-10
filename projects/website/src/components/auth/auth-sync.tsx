"use client";

import useDatabase from "@/hooks/use-database";
import useMe from "@/hooks/use-me";
import { useEffect } from "react";

/**
 * Keeps the main player in the local database in sync with the signed-in user.
 *
 * The session is the only source of the main player: signing in sets it, signing out clears it.
 * Loading and failed requests change nothing, so an unreachable backend never signs anyone out.
 */
export function AuthSync() {
  const database = useDatabase();
  const { data: me, isSuccess } = useMe();
  const playerId = me?.playerId ?? undefined;

  useEffect(() => {
    if (!database || !isSuccess) {
      return;
    }
    database.setMainPlayerId(playerId);
  }, [database, isSuccess, playerId]);

  return null;
}
