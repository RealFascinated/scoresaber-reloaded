import { fetchUserPreferences, patchUserPreferences } from "@/common/preferences/preferences-api";
import useMe from "@/hooks/use-me";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferenceKey,
  type UserPreferences,
  type UserPreferencesPatch,
} from "@ssr/common/schemas/user/preferences";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

export const USER_PREFERENCES_QUERY_KEY = ["user", "preferences"] as const;
const USER_PREFERENCES_MUTATION_KEY = ["user", "preferences", "update"] as const;

/**
 * Gets the preferences of the signed-in user (cached).
 *
 * They only change through `useUpdateUserPreferences`, which keeps the cache current, so they are
 * never refetched on their own. `data` is always set: the defaults until the real ones arrive
 * and for signed-out visitors.
 */
export function useUserPreferences() {
  const query = useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: fetchUserPreferences,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: DEFAULT_USER_PREFERENCES,
  });
  return { ...query, data: query.data ?? DEFAULT_USER_PREFERENCES };
}

/**
 * Gets a single preference. The component only re-renders when that preference changes.
 *
 * @param key the preference to get
 */
export function useUserPreference<Key extends UserPreferenceKey>(key: Key): UserPreferences[Key] {
  const { data } = useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: fetchUserPreferences,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: DEFAULT_USER_PREFERENCES,
    select: preferences => preferences[key],
  });
  return data ?? DEFAULT_USER_PREFERENCES[key];
}

/**
 * Updates one or many preferences at once.
 *
 * The cache is updated immediately and rolled back if the backend rejects the update. Updates
 * are sent one after another so they can't overwrite each other. Signed-out visitors can still
 * change them, but only for the current page session.
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isSignedIn = !!me;

  const mutation = useMutation({
    mutationKey: USER_PREFERENCES_MUTATION_KEY,
    scope: { id: "user-preferences" },
    mutationFn: async (patch: UserPreferencesPatch) => (isSignedIn ? patchUserPreferences(patch) : undefined),
    onMutate: async patch => {
      await queryClient.cancelQueries({ queryKey: USER_PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<UserPreferences>(USER_PREFERENCES_QUERY_KEY);
      queryClient.setQueryData<UserPreferences>(USER_PREFERENCES_QUERY_KEY, {
        ...(previous ?? DEFAULT_USER_PREFERENCES),
        ...patch,
      });
      return { previous };
    },
    onSuccess: saved => {
      // While more updates are queued the cache already holds their values, don't undo them
      if (saved && queryClient.isMutating({ mutationKey: USER_PREFERENCES_MUTATION_KEY }) <= 1) {
        queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, saved);
      }
    },
    onError: (error, _patch, context) => {
      queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, context?.previous);
      toast.error(error instanceof Error ? error.message : "Failed to save your preferences");
    },
  });

  const update = useCallback((patch: UserPreferencesPatch) => mutation.mutate(patch), [mutation.mutate]);
  const updateAsync = useCallback(
    (patch: UserPreferencesPatch) => mutation.mutateAsync(patch).then(() => undefined),
    [mutation.mutateAsync]
  );

  return { update, updateAsync, isPending: mutation.isPending, isSignedIn };
}
