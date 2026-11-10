"use client";

import { changeFollowing, fetchFollowing } from "@/common/following/following-api";
import { hasImportedLegacySettings, importLegacySettings } from "@/common/preferences/legacy-settings";
import { FOLLOWING_QUERY_KEY } from "@/hooks/use-following";
import useMe from "@/hooks/use-me";
import { useUpdateUserPreferences, useUserPreferences } from "@/hooks/use-user-preferences";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * On the first page load after signing in, moves the settings and friends saved in this browser by
 * the old client database into the account. The old database is deleted afterwards and never
 * read again.
 */
export function LegacySettingsImport() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: preferences, isPlaceholderData } = useUserPreferences();
  const { updateAsync } = useUpdateUserPreferences();
  const started = useRef(false);

  const ready = !!me && !isPlaceholderData;

  useEffect(() => {
    if (!ready || started.current || hasImportedLegacySettings()) {
      return;
    }
    started.current = true;

    async function runImport() {
      const followingIds = await queryClient.fetchQuery({
        queryKey: FOLLOWING_QUERY_KEY,
        queryFn: fetchFollowing,
        staleTime: Infinity,
      });

      await importLegacySettings({
        preferences,
        followingIds,
        playerId: me?.playerId ?? undefined,
        savePreferences: updateAsync,
        follow: async playerId => {
          queryClient.setQueryData(FOLLOWING_QUERY_KEY, await changeFollowing(playerId, "follow"));
        },
      });
    }

    runImport().catch(error => {
      // Leave the old database and the marker alone so the next page load retries
      console.error("Failed to import the old settings", error);
    });
  }, [ready, preferences, me, updateAsync, queryClient]);

  return null;
}
