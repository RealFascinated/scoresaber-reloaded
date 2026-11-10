import {
  createUserOverlay,
  deleteUserOverlay,
  duplicateUserOverlay,
  fetchUserOverlay,
  fetchUserOverlays,
} from "@/common/overlay/overlay-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const USER_OVERLAYS_QUERY_KEY = ["user-overlays"] as const;

export function useUserOverlays(enabled: boolean) {
  return useQuery({ queryKey: USER_OVERLAYS_QUERY_KEY, queryFn: fetchUserOverlays, enabled });
}

export function useUserOverlay(id: string) {
  return useQuery({
    queryKey: [...USER_OVERLAYS_QUERY_KEY, id],
    queryFn: () => fetchUserOverlay(id),
    // The editor owns the document once it is loaded
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

export function useUserOverlayMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: USER_OVERLAYS_QUERY_KEY, exact: true });

  return {
    create: useMutation({ mutationFn: createUserOverlay, onSuccess: refresh }),
    duplicate: useMutation({ mutationFn: duplicateUserOverlay, onSuccess: refresh }),
    remove: useMutation({ mutationFn: deleteUserOverlay, onSuccess: refresh }),
  };
}
